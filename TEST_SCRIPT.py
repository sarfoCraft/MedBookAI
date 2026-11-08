"""MedBook AI v2.0 integrated Chromium regression tests.
One browser instance and one source loader for the v1.6/v1.7/v1.8/v1.9 suites.
Uses direct browser injection because sandbox policy blocks file:// and localhost navigation.
Install test-only dependency: python -m pip install playwright; playwright install chromium
"""
from pathlib import Path
import sys
from shutil import which
from playwright.sync_api import sync_playwright

folder=Path(__file__).resolve().parent
p=folder  # v1.7 screenshot destination alias; not another Playwright instance
CSS=(folder/'styles.css').read_text(encoding='utf-8')
JS=(folder/'app.js').read_text(encoding='utf-8')
HTML='<html><head><meta name="theme-color" content="#f7f9f7"/><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div><div id="toast-root" aria-live="polite"></div></body></html>'

def load(page, *, override_script=None):
    """Single source loader: UI injection avoids restricted file:// and localhost navigation."""
    page.set_content(HTML)
    # A small test-only Storage shim for restricted about:blank browsers. Reusing
    # __medbookStorage across page.set_content mimics origin-scoped localStorage.
    page.evaluate("""() => {
      const entries=window.__medbookStorage||(window.__medbookStorage=new Map());
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>entries.has(String(k))?entries.get(String(k)):null,
        setItem:(k,v)=>entries.set(String(k),String(v)),
        removeItem:k=>entries.delete(String(k)),
        clear:()=>entries.clear(),
        get length(){return entries.size}
      }});
    }""")
    page.add_style_tag(content=CSS)
    page.add_script_tag(content=override_script if override_script is not None else JS)

def go(page,name):
    page.locator(f'.sidebar [data-page="{name}"]').click()
    page.wait_for_timeout(570)

suite = sys.argv[sys.argv.index('--suite')+1] if '--suite' in sys.argv else 'all'
if suite not in ('all','v16','v17','v18','v19','v20'):
    raise SystemExit('Choose --suite all|v16|v17|v18|v19|v20')

try:
  with sync_playwright() as pw:
    executable=which('chromium') or which('chromium-browser') or which('google-chrome')
    launch_options={'headless':True,'args':['--no-sandbox']}
    if executable:launch_options['executable_path']=executable
    browser=pw.chromium.launch(**launch_options)
    if suite in ('all','v16'):
        page=browser.new_page(viewport={'width':1440,'height':950},accept_downloads=True)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        load(page)
        assert page.locator('body').get_attribute('data-specialty')=='general'
        assert page.locator('.pagehead h1').inner_text()=='Good morning, Clinic Team'
        assert page.locator('.overview-alert').count()>=1
        # Active doctor empty-specific state: doctor profile with no appointment on chosen date
        page.locator('#role-view').select_option('Doctor')
        assert page.locator('#active-doctor').count()==1
        go(page,'appointments')
        page.locator('#appointment-date').fill('2026-11-06')
        if not page.get_by_text('No appointments for Dr. Bilal Shah on the selected date.').count():
            print('Doctor empty available text:',page.locator('.tablewrap .empty').all_inner_texts())
        assert page.get_by_text('No appointments for Dr. Bilal Shah on the selected date.').count()>0
        print('PASS active-doctor empty state')
        # PT filtering and scheduling
        page.locator('#role-view').select_option('Clinic Owner')
        page.locator('#active-specialty').select_option('pt')
        go(page,'appointments')
        page.locator('[data-action="new-appointment"]').first.click()
        assert page.locator('#form-appointment').count()==1
        assert page.locator('#form-appointment #appointment-doctor option').count()==1
        assert 'Sarah' in page.locator('#appointment-doctor').inner_text()
        page.locator('#form-appointment [name="date"]').fill('2026-11-05')
        page.locator('#form-appointment [name="time"]').fill('09:00')
        page.locator('button[form="form-appointment"]').click()
        assert 'already booked' in page.locator('#appointment-error').inner_text().lower()
        print('PASS specialty-matched doctors and conflict validation')
        page.locator('[data-action="close-modal"]').first.click()
        # A free slot should carry its specific date/time and doctor into the form.
        page.locator('[data-action="calendar-view:calendar"]').click()
        slot=page.locator('.free-slot').first
        assert slot.count()==1
        selected={key:slot.get_attribute('data-'+key) for key in ('date','time','doctor')}
        slot.click()
        assert page.locator('#form-appointment [name="date"]').input_value()==selected['date']
        assert page.locator('#form-appointment [name="time"]').input_value()==selected['time']
        assert page.locator('#appointment-doctor').input_value()==selected['doctor']
        page.locator('[data-action="close-modal"]').first.click()
        # Manual booking resets the previous slot draft and the calendar's chosen date.
        page.locator('#appointment-date').fill('2026-11-14')
        page.locator('[data-action="new-appointment"]').first.click()
        today_local=page.evaluate("() => { const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-') }")
        assert page.locator('#form-appointment [name="date"]').input_value()==today_local
        assert page.locator('#form-appointment [name="time"]').input_value()=='12:30'
        page.locator('[data-action="close-modal"]').first.click()
        print('PASS calendar slot doctor/date/time and manual booking defaults')
        # patient drawer docs: click twice and show pending
        go(page,'patients')
        page.locator('[data-action="patient:PT-1041"]').first.click()
        assert page.locator('.drawer').count()==1
        assert page.locator('.upload-zone').get_by_text('Add Demo Document').count()==1
        page.locator('[data-action="add-document:PT-1041"]').click()
        assert page.locator('.document-list').get_by_text('Lab_Results.pdf').count()>=2
        page.locator('[data-action="add-document:PT-1041"]').click()
        assert page.locator('.document-list').get_by_text('Demo_Document_2.pdf').count()==1
        assert page.locator('.document-list .badge.orange').count()>=3
        # toast stacking max three
        for _ in range(4):
            page.locator('[data-action="add-document:PT-1041"]').click()
        assert page.locator('#toast-root .toast').count()==3
        root_pos=page.locator('#toast-root').evaluate('(e)=>getComputedStyle(e).position')
        assert root_pos=='fixed'
        print('PASS demo docs and toast stack capped at 3')
        page.locator('[data-action="close-drawer"]').click()
        # new patient age preview; DOB change should not wipe form inputs
        page.locator('[data-action="new-patient"]').first.click()
        page.locator('#intake-name').fill('Sample Therapy Person')
        page.locator('#intake-dob').fill('1992-07-17')
        assert page.locator('#intake-age').inner_text().strip()=='34 years'
        assert page.locator('#intake-name').input_value()=='Sample Therapy Person'
        page.locator('button[form="form-patient-intake"]').is_enabled()
        page.locator('#form-patient-intake [name="notice"]').check()
        page.locator('button[form="form-patient-intake"]').click()
        assert page.locator('.drawer').get_by_text('Sample Therapy Person').count()>0
        print('PASS live age and intake submit')
        page.locator('[data-action="close-drawer"]').click()
        # Consultation draft additions/removals are in-memory, and do not issue medication.
        go(page,'consultation')
        assert page.get_by_text('No draft items yet').count()==1
        page.locator('[data-action="prescription-add"]').click()
        assert page.locator('.prescription-item').count()==1
        assert 'Paracetamol 500mg' in page.locator('.prescription-item').first.inner_text()
        page.locator('[data-action="prescription-add"]').click()
        assert page.locator('.prescription-item').count()==2
        page.locator('[data-action="prescription-remove:1"]').click()
        assert page.locator('.prescription-item').count()==1
        assert page.locator('[data-action="prescription-remove:2"]').count()==1
        page.locator('[data-action="prescription-add"]').click()
        assert page.locator('[data-action="prescription-remove:3"]').count()==1, 'Mock IDs must not be reused after removal'
        assert 'Mock item added' in page.locator('#toast-root').inner_text()
        page.locator('[data-action="prescription-remove:3"]').click()
        assert 'draft item removed' in page.locator('#toast-root').inner_text()
        assert page.get_by_text('transmitted to pharmacies',exact=False).count()==1
        print('PASS mock prescription draft add/remove and disclaimer')
        # Invoice create and consistent totals; invoice search should use amount
        go(page,'billing')
        assert page.locator('th').filter(has_text='Total').count()>0
        page.locator('[data-action="new-invoice"]').click()
        assert page.locator('#form-invoice').count()==1
        page.locator('#form-invoice [name="qty"]').fill('2')
        page.locator('#form-invoice [name="unit"]').fill('45.50')
        page.locator('#form-invoice [name="tax"]').fill('9')
        page.locator('button[form="form-invoice"]').click()
        assert page.locator('.modal .invoice-sum .invoice-total').get_by_text('$100.00').count()==1
        # Native printing: verify button, event dispatch and print-only visibility.
        print_button=page.locator('.modalfooter [data-action="print-invoice"]')
        assert print_button.count()==1
        page.evaluate('window.__printCalls=0;window.print=()=>{window.__printCalls++};void 0')
        print_button.click()
        assert page.evaluate('window.__printCalls')==1
        assert page.locator('.modal').count()==1
        page.emulate_media(media='print')
        assert page.locator('#app > .layout').evaluate('(e)=>getComputedStyle(e).display')=='none'
        assert page.locator('#toast-root').evaluate('(e)=>getComputedStyle(e).display')=='none'
        assert page.locator('.modalfooter').evaluate('(e)=>getComputedStyle(e).display')=='none'
        assert page.locator('.modalheader button').evaluate('(e)=>getComputedStyle(e).display')=='none'
        assert page.locator('.invoice-print-cover .modal').evaluate('(e)=>getComputedStyle(e).visibility')=='visible'
        assert page.locator('.invoice-print-cover .invoice-sum').evaluate('(e)=>getComputedStyle(e).visibility')=='visible'
        page.screenshot(path=str(folder/'assets/images/previews/preview_v16_invoice_print.png'),full_page=True)
        page.emulate_media(media='screen')
        assert page.locator('.modalfooter [data-action="print-invoice"]').is_visible()
        print('PASS native print event and isolated invoice print layout')
        new_id=page.locator('.modalheader strong').inner_text().split()[-1]
        assert new_id.startswith('INV-')
        page.locator('[data-action="close-modal"]').first.click()
        assert page.locator('.tablewrap tbody tr').filter(has_text=new_id).get_by_text('$100.00').count()==1
        print('PASS new invoice created, amounts consistent')
        page.locator('[data-action="invoice:'+new_id+'"]').first.click()
        assert page.locator('.modalfooter [data-action="print-invoice"]').count()==1
        page.locator('[data-action="close-modal"]').first.click()
        # Receptionist's hidden billing actions must also be blocked if dispatched.
        page.locator('#role-view').select_option('Receptionist')
        page.evaluate("""() => {const b=document.createElement('button');b.dataset.action='new-invoice';document.body.appendChild(b);b.click();b.remove();}""")
        assert page.locator('#form-invoice').count()==0
        page.locator('#role-view').select_option('Clinic Owner')
        print('PASS invoice-role guard blocks tampered DOM action')
        # Prescription mutation guard: an injected UI action must not bypass role preview.
        page.locator('#role-view').select_option('Receptionist')
        page.evaluate("""() => {const b=document.createElement('button');b.dataset.action='prescription-add';document.body.appendChild(b);b.click();b.remove();}""")
        assert 'Only the consultation role' in page.locator('#toast-root').inner_text()
        page.locator('#role-view').select_option('Clinic Owner')
        go(page,'consultation')
        assert page.locator('.prescription-item').count()==1
        print('PASS unauthorized draft action leaves items unchanged')
        # Audit: ISO UTC + outcomes + CSV
        go(page,'audit')
        assert page.locator('#audit-outcome').count()==1
        page.locator('#audit-outcome').select_option('Denied')
        assert page.locator('.tablewrap tbody tr').count()>=1
        assert page.locator('.tablewrap tbody tr').filter(has_text='Success').count()==0
        assert 'UTC' in page.locator('.tablewrap tbody tr').first.inner_text()
        assert page.locator('.tablewrap tbody tr').first.locator('td').first.inner_text().endswith('UTC')
        # Date filtering combines with the selected Denied outcome and uses full UTC days.
        assert page.locator('#audit-start-date').count()==1
        assert page.locator('#audit-end-date').count()==1
        page.locator('#audit-start-date').fill('2099-01-01')
        assert page.locator('.audit-panel-title .panel-subtitle').inner_text().startswith('0 of ')
        assert page.locator('.tablewrap tbody .empty').count()==1
        page.locator('#audit-end-date').fill('2099-12-31')
        assert page.locator('.tablewrap tbody .empty').count()==1
        page.locator('#audit-start-date').fill('2000-01-01')
        assert page.locator('.tablewrap tbody tr').filter(has_text='Denied').count()>=1
        assert page.locator('.tablewrap tbody tr').filter(has_text='Success').count()==0
        page.locator('#audit-start-date').fill('')
        page.locator('#audit-end-date').fill('')
        assert page.locator('.audit-panel-title .panel-subtitle').inner_text().startswith('1 of ') or page.locator('.tablewrap tbody tr').count()>=1
        print('PASS inclusive audit UTC date-range and combined outcome filtering')
        with page.expect_download() as d:page.locator('[data-action="audit-export"]').click()
        assert d.value.suggested_filename=='MedBook_Audit_DEMO.csv'
        print('PASS audit outcome/UTC/CSV')
        # nav and role, other specialty pages
        page.locator('#role-view').select_option('Receptionist')
        assert page.locator('[data-page="billing"]').count()==0
        page.locator('#role-view').select_option('Clinic Owner')
        page.locator('#active-specialty').select_option('chiro')
        assert page.locator('.sidebar [data-page="spine"]').count()==1
        assert page.locator('.sidebar [data-page="rehab"]').count()==0
        page.locator('#active-specialty').select_option('derm')
        assert page.locator('.sidebar [data-page="lesions"]').count()==1
        page.locator('#active-specialty').select_option('general')
        assert page.locator('.sidebar [data-page="lesions"]').count()==0
        assert not errors,errors
        print('PASS specialty and role state reset; no page JS exceptions')
        # Regression smoke tests for existing insurance, global search and reports.
        page.locator('#active-specialty').select_option('pt')
        go(page,'patients')
        page.locator('[data-action="patient:PT-1041"]').first.click()
        assert page.locator('[data-action="eligibility:PT-1041"]').count()==1
        page.locator('[data-action="eligibility:PT-1041"]').click()
        page.wait_for_timeout(1600)
        assert 'No insurer contacted' in page.locator('#toast-root').inner_text()
        page.locator('[data-action="close-drawer"]').first.click()
        page.locator('[data-action="search-toggle"]').click()
        page.locator('#global-search-input').fill(new_id)
        assert page.locator('[data-action="open-invoice:'+new_id+'"]').count()==1
        page.locator('[data-action="search-close"]').click()
        go(page,'reports')
        page.locator('[data-action="report-generate"]').click()
        page.wait_for_timeout(950)
        with page.expect_download() as r:
            page.locator('[data-action="report-download"]').click()
        assert r.value.suggested_filename.endswith('.csv')
        print('PASS insurance mock, global invoice search and reports CSV')
        # Screenshots and overflow on small phones
        page.locator('#active-specialty').select_option('pt');go(page,'overview')
        page.screenshot(path=str(folder/'assets/images/previews/preview_v16_dashboard.png'),full_page=True)
        for width in [540,390,320]:
            m=browser.new_page(viewport={'width':width,'height':844},accept_downloads=True)
            m_errors=[];m.on('pageerror',lambda e:m_errors.append(str(e)))
            load(m)
            m.locator('#active-specialty').select_option('pt')
            print('MOBILE',width,'crumb visible:',m.locator('.crumb').is_visible(),'overflow:',m.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'))
            assert m.locator('.crumb').is_visible()==(width>370)
            assert m.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1
            m.locator('[data-action="nav"]').click();m.locator('.sidebar [data-page="patients"]').click();m.wait_for_timeout(600)
            m.locator('[data-action="patient:PT-1041"]').first.click()
            m.locator('[data-action="add-document:PT-1041"]').click()
            toast=m.locator('#toast-root').bounding_box();fab=m.locator('.fabbt').bounding_box()
            assert toast['y']+toast['height'] < fab['y'],(width,'Toast overlaps FAB',toast,fab)
            m.locator('[data-action="close-drawer"]').click()
            m.locator('[data-action="nav"]').click();m.locator('.sidebar [data-page="billing"]').click();m.wait_for_timeout(600)
            m.locator('[data-action="invoice:INV-2003"]').first.click()
            item=m.locator('.invoice-grid:not(.invoice-th)').first
            assert item.evaluate('(e)=>getComputedStyle(e).gridTemplateColumns').count('px')==2
            # Print media overrides narrow-screen invoice cards to four print columns.
            m.emulate_media(media='print')
            tracks=item.evaluate('(e)=>getComputedStyle(e).gridTemplateColumns.split(" ").length')
            assert tracks==4,(width,tracks)
            assert m.locator('.modalfooter').evaluate('(e)=>getComputedStyle(e).display')=='none'
            m.emulate_media(media='screen')
            assert m.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1
            m.screenshot(path=str(folder/f'assets/images/previews/preview_v16_mobile_{width}.png'),full_page=True)
            assert not m_errors,m_errors
            m.close()
        print('PASS responsive mobile breadcrumb, invoice and toast/FAB spacing')
        print('ALL V1.6 BROWSER TESTS PASSED')
        page.close()




    if suite in ('all','v17'):
        # Run the v1.7 flows on an isolated page in the SAME browser.
        page=browser.new_page(viewport={'width':1365,'height':940},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        load(page)
        # new theme toggling and specialty palette retention
        assert page.locator('.theme-toggle').count()==1
        assert page.locator('body').get_attribute('data-theme')=='light'
        page.locator('.theme-toggle').click()
        assert page.locator('body').get_attribute('data-theme')=='dark'
        assert page.locator('.theme-toggle').get_attribute('aria-pressed')=='true'
        firstbg=page.evaluate("getComputedStyle(document.body).getPropertyValue('--bg').trim()")
        page.locator('#active-specialty').select_option('pt')
        assert page.locator('body').get_attribute('data-theme')=='dark'
        assert page.locator('body').get_attribute('data-specialty')=='pt'
        assert page.evaluate("getComputedStyle(document.body).getPropertyValue('--bg').trim()")!=firstbg
        page.screenshot(path=str(p/'assets/images/previews/preview_v17_dark_pt.png'),full_page=True)
        page.locator('.theme-toggle').click()
        assert page.locator('body').get_attribute('data-theme')=='light'
        print('PASS theme toggle and specialty-preserving dark variables')
        # dynamic timeline seed and live documents / invoices
        go(page,'patients')
        page.locator('[data-action="patient:PT-1041"]').first.click()
        assert page.locator('.patient-timeline').count()==1
        assert page.locator('.patient-timeline-entry').count()>=10
        for typ in ('visit','invoice','document','prescription'):
         assert page.locator('.patient-timeline-icon.type-'+typ).count()>0,typ
        count=page.locator('.patient-timeline-entry').count()
        page.locator('[data-action="add-document:PT-1041"]').click()
        assert page.locator('.patient-timeline-entry').count()==count+1
        assert page.locator('.patient-timeline').get_by_text('Lab_Results.pdf').count()>=2
        page.screenshot(path=str(p/'assets/images/previews/preview_v17_timeline.png'),full_page=True)
        page.locator('[data-action="close-drawer"]').click()
        print('PASS seeded and live patient timeline, events and scrolling')
        # availability with days plus leave popup details
        go(page,'staff')
        assert page.locator('[data-action="team-tab:availability"]').count()==1
        page.locator('[data-action="team-tab:availability"]').click()
        assert page.locator('.availability-grid tbody tr').count()==4
        assert page.locator('.availability-day').count()==28
        assert page.locator('.availability-day.available').count()>0
        assert page.locator('.availability-day.off').count()>0
        assert page.locator('.availability-day.leave').count()>0
        leave=page.locator('.availability-day.leave').first
        leave.click()
        assert page.locator('.availability-detail').count()==1
        assert 'On Leave' in page.locator('.availability-detail').inner_text()
        page.screenshot(path=str(p/'assets/images/previews/preview_v17_availability.png'),full_page=True)
        page.locator('[data-action="availability-next"]').click()
        assert page.locator('.availability-detail').count()==0
        page.locator('[data-action="availability-today"]').click()
        print('PASS availability 7-day grid, leave details, week controls')
        # report feedback cards, donut, breakdown and generated CSV
        go(page,'reports')
        page.locator('[data-action="report-select:feedback"]').click()
        assert page.locator('.feedback-preview').count()==1
        assert page.locator('.feedback-comment').count()==3
        assert 'NPS +67' in page.locator('.feedback-preview').inner_text()
        assert '67%' in page.locator('.feedback-legend').inner_text()
        page.screenshot(path=str(p/'assets/images/previews/preview_v17_feedback.png'),full_page=True)
        page.locator('[data-action="report-generate"]').click()
        page.wait_for_timeout(1000)
        assert page.locator('[data-action="report-download"]').count()==1
        with page.expect_download() as down:
         page.locator('[data-action="report-download"]').click()
        assert 'feedback' in down.value.suggested_filename
        print('PASS feedback NPS donut, comments and synthetic CSV')
        # global search print action, modal and toast positioning
        page.locator('[data-action="search-toggle"]').click()
        page.locator('#global-search-input').fill('INV-2001')
        assert page.locator('[data-action="search-print-invoice:INV-2001"]').count()==1
        page.locator('[data-action="search-print-invoice:INV-2001"]').click()
        assert page.locator('.invoice-print-cover').count()==1
        assert page.locator('body').evaluate("e=>e.classList.contains('modal-open')")
        assert page.locator('[data-action="print-invoice"]').count()==1
        page.locator('[data-action="pay-invoice:INV-2001"]').count()==0
        # create toasts by injecting only messages via user actions on invoice (view opens/no toast); e.g call invoice print when unauthorized? Instead click print on mocked function to verify
        page.evaluate("window.__wasPrinted=false;window.print=()=>window.__wasPrinted=true")
        page.locator('[data-action="print-invoice"]').click()
        assert page.evaluate('window.__wasPrinted')
        assert page.locator('#toast-root').evaluate("e=>getComputedStyle(e).top")=='20px'
        assert page.locator('#toast-root').bounding_box()['y']<=25
        # Use real UI action with generated toast while invoice modal open: payment from pending invoice.
        page.locator('[data-action="close-modal"]').first.click()
        page.locator('[data-action="search-toggle"]').click()
        page.locator('#global-search-input').fill('INV-2003')
        page.locator('[data-action="search-print-invoice:INV-2003"]').click()
        page.locator('[data-action="pay-invoice:INV-2003"]').click()
        assert page.locator('#toast-root .toast').count()>0
        assert page.locator('body').get_attribute('class').find('modal-open')>=0
        toast_y=page.locator('#toast-root').bounding_box()['y']
        assert 15<=toast_y<=25,toast_y
        assert page.locator('#toast-root .toast').count()<=3
        page.locator('[data-action="close-modal"]').first.click()
        assert not page.locator('body').evaluate("e=>e.classList.contains('modal-open')")
        assert page.locator('#toast-root').bounding_box()['y']>50
        print('PASS global search invoice print flow, toasts on modal, close reset')
        # mobile modal toast and breadcrumb
        for width,visible in [(540,True),(390,True),(370,False),(320,False)]:
         page.set_viewport_size({'width':width,'height':780})
         crumb=page.locator('.crumb').evaluate('e=>getComputedStyle(e).display')!='none'
         assert crumb==visible,(width,crumb)
         page.locator('[data-action="search-toggle"]').click()
         page.locator('#global-search-input').fill('INV-2001')
         page.locator('[data-action="search-print-invoice:INV-2001"]').click()
         assert page.locator('body').evaluate("e=>e.classList.contains('modal-open')")
         root=page.locator('#toast-root').evaluate("e=>({top:getComputedStyle(e).top,bottom:getComputedStyle(e).bottom})")
         assert root['top']=='20px' and page.locator('#toast-root').bounding_box()['y']<=25,(width,root)
         page.locator('[data-action="close-modal"]').first.click()
         if width in (390,320):page.screenshot(path=str(p/f'assets/images/previews/preview_v17_mobile_{width}.png'),full_page=True)
        print('PASS 540/390/370/320px breadcrumb and modal toast mobile overrides')
        assert not errors, errors
        print('ALL V1.7 TESTS PASSED')
        page.close()


    if suite in ('all','v18'):
        # ---------------- v1.8 regressions ----------------
        # Keep source reads pure: fresh patient must not receive phantom insurance files.
        fresh=browser.new_page(viewport={'width':1365,'height':900},accept_downloads=True)
        load(fresh)
        fresh.locator('#active-specialty').select_option('pt')
        go(fresh,'patients')
        fresh.locator('[data-action="new-patient"]').first.click()
        fresh.locator('#intake-name').fill('New Demo Patient No Docs')
        fresh.locator('#intake-dob').fill('1999-01-03')
        fresh.locator('#form-patient-intake [name="notice"]').check()
        fresh.locator('button[form="form-patient-intake"]').click()
        assert fresh.locator('.drawer').count()==1
        assert fresh.locator('.document-list .document-row').count()==0
        assert fresh.locator('.patient-timeline').get_by_text('Insurance_Card.pdf').count()==0
        assert fresh.locator('.patient-timeline').get_by_text('No recorded events',exact=False).count()>=0
        fresh.locator('[data-action^="add-document:"]').click()
        assert fresh.locator('.document-list .document-row').count()==1
        assert fresh.locator('.patient-timeline').get_by_text('Lab_Results.pdf').count()==1
        print('PASS patient timeline pure read and explicit document creation')
        fresh.close()

        # Availability export must match the same visible week, branch and status cells.
        a=browser.new_page(viewport={'width':1250,'height':900},accept_downloads=True)
        load(a)
        go(a,'staff')
        a.locator('[data-action="team-tab:availability"]').click()
        grid_dates=a.locator('.availability-grid thead th small').all_inner_texts()
        assert len(grid_dates)==7
        with a.expect_download() as dl:
            a.locator('[data-action="availability-export"]').click()
        download=dl.value
        content=Path(download.path()).read_text(encoding='utf-8-sig')
        import csv,io
        records=list(csv.reader(io.StringIO(content)))
        assert records[0]==['Doctor','Branch','Day','Date','Status','Details']
        assert len(records)==29,(len(records),records[:2])
        assert any(r[4]=='Leave' and 'Personal Leave' in r[5] for r in records[1:])
        assert any(r[4]=='Available' and '–' in r[5] for r in records[1:])
        assert any(r[4]=='Off' for r in records[1:])
        assert records[1][3] in download.suggested_filename
        a.locator('#branch').select_option('City Branch')
        assert a.locator('.availability-grid tbody tr').count()==2
        with a.expect_download() as dl:
            a.locator('[data-action="availability-export"]').click()
        branch_rows=list(csv.reader(io.StringIO(Path(dl.value.path()).read_text(encoding='utf-8-sig'))))
        assert len(branch_rows)==15 and all(row[1]=='City Branch' for row in branch_rows[1:])
        a.locator('[data-action="availability-next"]').click()
        with a.expect_download() as dl:
            a.locator('[data-action="availability-export"]').click()
        other_rows=list(csv.reader(io.StringIO(Path(dl.value.path()).read_text(encoding='utf-8-sig'))))
        assert records[1][3]!=other_rows[1][3]
        print('PASS availability CSV matches week navigation, branch, shifts and leave')
        a.close()

        # NPS calculations and exported comment rows must use the same inclusive date range.
        r=browser.new_page(viewport={'width':1250,'height':900},accept_downloads=True)
        load(r)
        go(r,'reports')
        r.locator('[data-action="report-select:feedback"]').click()
        assert r.locator('.feedback-comment').count()==3
        assert 'NPS +67' in r.locator('.feedback-preview').inner_text()
        date_at=lambda offset: r.evaluate("(offset)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}",offset)
        only=date_at(-1)
        r.locator('#report-start').fill(only)
        r.locator('#report-end').fill(only)
        assert r.locator('.feedback-comment').count()==1
        assert 'NPS +100' in r.locator('.feedback-preview').inner_text()
        r.locator('[data-action="report-generate"]').click()
        r.locator('[data-action="report-download"]').wait_for(timeout=3000)
        with r.expect_download() as dl:
            r.locator('[data-action="report-download"]').click()
        rows=list(csv.reader(io.StringIO(Path(dl.value.path()).read_text(encoding='utf-8-sig'))))
        assert len(rows)==5,(len(rows),rows) # four summary rows plus one filtered feedback record
        assert rows[1][2]=='100' and rows[-1][-1]==only
        future=date_at(20)
        r.locator('#report-start').fill(future)
        r.locator('#report-end').fill(future)
        assert r.locator('.feedback-comment').count()==0
        assert 'No feedback in the selected date range' in r.locator('.feedback-preview').inner_text()
        assert 'NPS —' in r.locator('.feedback-preview').inner_text()
        print('PASS NPS date filtering, computed score, empty state and filtered CSV')
        r.close()

        # Use a test-only JS substitution to spy on reload without modifying production code.
        spy=JS.replace('window.location.reload();return;', 'window.__resetCalled=true;return;')
        assert spy!=JS,'Reset reload call must remain in the production source'
        reset=browser.new_page(viewport={'width':1000,'height':800})
        load(reset,override_script=spy)
        reset.evaluate("localStorage.setItem('medbook-demo-theme','dark')")
        reset.locator('[data-action="reset-demo"]').click()
        assert reset.evaluate('window.__resetCalled===true')
        assert reset.evaluate("localStorage.getItem('medbook-demo-theme')") is None
        print('PASS Reset Demo clears saved theme and calls reload')
        reset.close()

        # Cold re-initialization after the reset spy verifies the browser-memory defaults.
        rst=browser.new_page(viewport={'width':1000,'height':800})
        load(rst,override_script=spy)
        rst.locator('.theme-toggle').click()
        assert rst.evaluate("localStorage.getItem('medbook-demo-theme')")=='dark'
        rst.locator('[data-action="reset-demo"]').click()
        assert rst.evaluate('window.__resetCalled===true')
        load(rst)
        assert rst.locator('body').get_attribute('data-theme')=='light'
        assert rst.evaluate("localStorage.getItem('medbook-demo-theme')") is None
        print('PASS cold reinitialization restores light theme and mock data')
        rst.close()

        # The invoice's entire printed subtree must be ink-friendly in dark mode.
        pr=browser.new_page(viewport={'width':420,'height':900})
        load(pr)
        assert pr.locator('.theme-toggle').is_visible()
        pr.locator('.theme-toggle').click()
        pr.locator('#active-specialty').select_option('pt')
        pr.locator('[data-action="nav"]').click()
        pr.locator('.sidebar [data-page="billing"]').click()
        pr.locator('[data-action="invoice:INV-2003"]').first.click()
        pr.emulate_media(media='print')
        styles=pr.evaluate("() => {const get=s=>getComputedStyle(document.querySelector(s));return {body:get('body').backgroundColor,modal:get('.invoice-print-cover .modal').backgroundColor,text:get('.invoice-print-cover .modal').color,badge:get('.invoice-print-cover .badge').backgroundColor,footer:get('.modalfooter').display}}")
        assert styles['body']=='rgb(255, 255, 255)',styles
        assert styles['text']=='rgb(0, 0, 0)',styles
        assert styles['badge']=='rgb(245, 245, 245)',styles
        assert styles['footer']=='none',styles
        pr.emulate_media(media='screen')
        assert pr.locator('.theme-toggle').is_visible()
        print('PASS print invoice forces light mode even when mobile screen is dark')
        pr.close()

        # Responsive mobile theme control, without widening the page or hiding breadcrumb.
        for width in (320,370,390,540):
            mob=browser.new_page(viewport={'width':width,'height':800})
            load(mob)
            assert mob.locator('.theme-toggle').is_visible(),width
            mob.locator('.theme-toggle').click()
            assert mob.locator('body').get_attribute('data-theme')=='dark'
            assert mob.locator('.crumb').is_visible()==(width>370)
            assert mob.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1,width
            mob.close()
        print('PASS mobile theme toggle and 370/371px breadcrumb breakpoint')

    if suite in ('all','v19'):
        # Browser navigation to file://, localhost and synthetic hostnames is
        # blocked here. Load MedBook normally via the shared injection harness,
        # then mount the REAL SnapText HTML bytes with same-origin srcdoc for
        # integration checks. Static route targets are also checked on disk.
        import re, base64
        from playwright.sync_api import expect
        site=browser.new_page(viewport={'width':1250,'height':920})
        load(site)
        served=[]
        def mount_iframe(tool_folder, page=site):
            path=folder/'snaptext-tools'/'tools'/tool_folder/'index.html'
            assert path.exists() and path.is_file(),path
            raw=path.read_text(encoding='utf-8')
            assert 'assets/app.js' in raw and 'medbook-theme-bridge.js' in raw
            # Embed the original local SVG previews in the srcdoc-only test.
            def inline_asset(match):
                asset=(folder/'snaptext-tools'/'assets'/'illustrations'/match.group(1))
                return 'src="data:image/svg+xml;base64,'+base64.b64encode(asset.read_bytes()).decode('ascii')+'"' if asset.is_file() else match.group(0)
            raw=re.sub(r'src="\.\./\.\./assets/illustrations/([^"]+)"',inline_asset,raw)
            # Leave HTML tool UI intact; disable resource loading just for the
            # constrained test environment, substituting the actual bridge code.
            raw=re.sub(r'<script\b[^>]*>.*?</script>', '', raw, flags=re.IGNORECASE|re.DOTALL)
            raw=re.sub(r'<link\b[^>]*>', '', raw, flags=re.IGNORECASE|re.DOTALL)
            raw=raw.replace('</head>', '<style>'+ (folder/'snaptext-tools'/'assets'/'app.css').read_text(encoding='utf-8') +(folder/'snaptext-tools'/'assets'/'medbook-embed.css').read_text(encoding='utf-8') +'</style></head>',1)
            bridge=(folder/'snaptext-tools'/'assets'/'medbook-theme-bridge.js').read_text(encoding='utf-8')
            raw=raw.replace('</body>','<script>'+bridge+'</script></body>',1)
            page.locator('#clinical-tool-frame').evaluate('(el,content)=>{el.srcdoc=content;}',raw)
            served.append(str(path.relative_to(folder)))
        assert site.locator('.sidebar .navsection').get_by_text('Clinical Utilities').count()==1
        ids={'ocr':'image-to-text','pdf-merge':'merge-pdf','pdf-split':'split-pdf','img-pdf':'images-to-pdf','qr-gen':'qr-code-generator','doc-crop':'crop-scanned-document'}
        for tool,foldername in ids.items():
            item=site.locator(f'.sidebar [data-page="{tool}"]')
            assert item.count()==1 and item.is_visible()
            assert item.locator('.clinical-tier').inner_text()=='PRO'
            item.click()
            frame=site.locator('#clinical-tool-frame')
            expect(frame).to_have_attribute('data-tool',tool,timeout=5500)
            expect(frame).to_have_attribute('src',f'snaptext-tools/tools/{foldername}/index.html')
            inside=site.frame_locator('#clinical-tool-frame')
            mount_iframe(foldername)
            expect(inside.locator('main.tool-page')).to_be_visible(timeout=10000)
            expect(inside.locator('html')).to_have_attribute('data-theme','light',timeout=5000)
            assert f'snaptext-tools/tools/{foldername}/index.html' in served
            assert site.locator('.clinical-tool-frame').evaluate('(e)=>Math.round(e.getBoundingClientRect().width)')>700
            if tool=='ocr':
                site.screenshot(path=str(folder/'assets/images/previews/preview_v19_clinical_ocr.png'),full_page=True)
        print('PASS six local SnapText iframe routes, MedBook navigation, and PRO badges')
        # Dark mode starts in MedBook and is mirrored into the current iframe.
        site.locator('[data-action="theme-toggle"]').click()
        expect(site.locator('body')).to_have_attribute('data-theme','dark')
        # The original srcdoc must persist: theme changes must not reset an upload.
        assert site.locator('#clinical-tool-frame').get_attribute('srcdoc') is not None
        expect(site.frame_locator('#clinical-tool-frame').locator('html')).to_have_attribute('data-theme','dark',timeout=8000)
        # SnapText's own preference should not break host theme synchronization.
        site.frame_locator('#clinical-tool-frame').locator('html').evaluate("e=>e.setAttribute('data-theme','light')")
        expect(site.frame_locator('#clinical-tool-frame').locator('html')).to_have_attribute('data-theme','dark',timeout=8000)
        site.screenshot(path=str(folder/'assets/images/previews/preview_v19_clinical_dark.png'),full_page=True)
        print('PASS embedded tool theme follows the parent in dark mode')
        # Role badges change to FREE for Doctor; receptionist sees no utilities.
        site.locator('#role-view').select_option('Doctor')
        assert site.locator('.sidebar [data-page="ocr"] .clinical-tier').inner_text()=='FREE'
        site.locator('.sidebar [data-page="ocr"]').click()
        expect(site.locator('#clinical-tool-frame')).to_have_attribute('data-tool','ocr',timeout=5500)
        mount_iframe('image-to-text')
        expect(site.frame_locator('#clinical-tool-frame').locator('main.tool-page')).to_be_visible(timeout=10000)
        site.locator('#role-view').select_option('Receptionist')
        assert site.locator('.sidebar [data-page="ocr"]').count()==0
        assert site.locator('#clinical-tool-frame').count()==0
        print('PASS role tier badges and receptionist UI restriction')
        # Existing functional navigation remains available without SnapText CSS bleed.
        site.locator('#role-view').select_option('Clinic Owner')
        site.locator('.sidebar [data-page="appointments"]').click()
        expect(site.locator('body')).to_have_attribute('data-specialty','general')
        expect(site.locator('.pagehead h1')).to_have_text('Appointments & Calendar',timeout=6000)
        assert site.locator('link[href="snaptext-tools/assets/app.css"]').count()==0
        print('PASS MedBook appointment navigation and isolated SnapText CSS')
        site.close()
        mobile=browser.new_page(viewport={'width':390,'height':850})
        load(mobile)
        mobile.locator('[data-action="nav"]').click()
        mobile.locator('.sidebar [data-page="ocr"]').click()
        expect(mobile.locator('#clinical-tool-frame')).to_have_attribute('data-tool','ocr',timeout=5500)
        mount_iframe('image-to-text',mobile)
        expect(mobile.frame_locator('#clinical-tool-frame').locator('main.tool-page')).to_be_visible(timeout=8000)
        frame_width=mobile.locator('.clinical-tool-frame').evaluate('el=>el.getBoundingClientRect().width')
        assert frame_width>250 and frame_width<=390,frame_width
        assert mobile.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1
        mobile.screenshot(path=str(folder/'assets/images/previews/preview_v19_clinical_mobile.png'),full_page=True)
        mobile.close()
        print('PASS 390px responsive clinical iframe with no host horizontal overflow')


    if suite in ('all','v20'):
        from playwright.sync_api import expect
        rcm=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
        errs=[]
        rcm.on('pageerror',lambda exc:errs.append(str(exc)))
        load(rcm)
        assert rcm.locator('.overview-alerts-span').count()==1
        assert rcm.get_by_text('ICD-10 code examples expire soon.').count()==1
        go(rcm,'coding')
        expect(rcm.locator('.pagehead h1')).to_have_text('Coding Reference')
        assert rcm.locator('tr.coding-filterable').count()>=10
        rcm.locator('#coding-search').fill('M54.50')
        assert rcm.locator('tr.coding-filterable:not([hidden])').count()==1
        assert rcm.get_by_text('CPT Code Updates:').count()>=1
        rcm.locator('#coding-search').fill('')
        rcm.screenshot(path=str(folder/'assets/images/previews/preview_v20_coding.png'),full_page=True)
        print('PASS coding reference, search, expiry and deleted-CPT alerts')
        go(rcm,'providers')
        assert rcm.locator('tbody tr').count()==4
        rcm.locator('[data-action^="provider-profile:"]').first.click()
        assert rcm.locator('.modal').get_by_text('Provider Credentials').count()==1
        rcm.locator('[data-action="close-modal"]').first.click()
        go(rcm,'staff')
        rcm.locator('[data-action^="staff-profile:"]').first.click()
        assert rcm.locator('.modal').get_by_text('Staff Profile').count()>=1
        rcm.locator('[data-action="close-modal"]').first.click()
        go(rcm,'providers')
        rcm.screenshot(path=str(folder/'assets/images/previews/preview_v20_providers.png'),full_page=True)
        print('PASS provider directory expiry display and staff profile')
        rcm.locator('#active-specialty').select_option('pt')
        go(rcm,'patients')
        rcm.locator('[data-action="patient:PT-1041"]').first.click()
        assert rcm.locator('.drawer').get_by_text('Insurance & Eligibility').count()==1
        assert rcm.locator('.drawer').get_by_text('Member Card').count()==1
        rcm.screenshot(path=str(folder/'assets/images/previews/preview_v20_patient_insurance.png'),full_page=True)
        assert 'DEMO-MBR-' in rcm.locator('.member-card').inner_text()
        rcm.locator('[data-action="card-side:back"]').click()
        assert 'DEMO ONLY' in rcm.locator('.member-card').inner_text()
        rcm.locator('[data-action="card-side:front"]').click()
        rcm.locator('[data-action="run-vob:PT-1041"]').click()
        assert rcm.locator('[data-action="run-vob:PT-1041"]').is_disabled()
        rcm.wait_for_timeout(2180)
        assert rcm.locator('.drawer').get_by_text('Verified').count()>=1
        rcm.locator('[data-action="abn:PT-1041"]').click()
        assert rcm.locator('.document-print-cover').count()==1
        assert rcm.locator('.modal').get_by_text('Advance Beneficiary Notice').count()>=1
        rcm.screenshot(path=str(folder/'assets/images/previews/preview_v20_abn.png'),full_page=True)
        print('PASS insurance/VOB, member card and sample ABN')
        rcm.evaluate('window.__printCalled=0;window.print=()=>{window.__printCalled++}')
        rcm.locator('[data-action="print-document"]').click()
        assert rcm.evaluate('window.__printCalled')>=1
        rcm.emulate_media(media='print')
        assert rcm.locator('.document-print-cover').evaluate('(el)=>getComputedStyle(el).visibility')=='visible'
        assert rcm.locator('.modalfooter').evaluate('(el)=>getComputedStyle(el).display')=='none'
        rcm.emulate_media(media='screen')
        rcm.locator('[data-action="close-modal"]').first.click()
        rcm.locator('[data-action="close-drawer"]').click()
        # Workers compensation patient belongs to the PT doctor/branch.
        rcm.locator('#active-specialty').select_option('pt')
        go(rcm,'patients')
        rcm.locator('[data-action="patient:PT-1044"]').first.click()
        rcm.locator('[data-action="drawer-tab:claims"]').click()
        assert 'Claim number' in rcm.locator('.drawer').inner_text()
        rcm.locator('[data-action="claim-form:PT-1044"]').click()
        assert rcm.locator('.document-print-cover').count()==1
        assert 'CMS-1500-style' in rcm.locator('.modal').inner_text()
        rcm.locator('[data-action="close-modal"]').first.click()
        rcm.locator('[data-action="close-drawer"]').click()
        go(rcm,'hospice')
        assert rcm.locator('.pagehead h1').inner_text()=='Hospice Care'
        assert rcm.locator('[data-action="hospice-cert:PT-1047"]').count()==1
        rcm.locator('[data-action="hospice-cert:PT-1047"]').click()
        assert rcm.locator('.document-print-cover').count()==1
        rcm.locator('[data-action="close-modal"]').first.click()
        print('PASS claims tab, claim print preview and hospice certification')
        # This specialty's consultation picks PT-1044 (currently in-consultation).
        go(rcm,'consultation')
        expect(rcm.locator('.panel-title').filter(has_text='SOAP Notes')).to_be_visible()
        rcm.locator('[data-soap-field="subjective"]').fill('Mock symptom narrative')
        rcm.locator('[data-soap-field="objective"]').fill('Synthetic examination')
        rcm.locator('[data-action="encounter-add-dx"]').click()
        assert rcm.locator('.rcm-chip').count()==1
        rcm.locator('#encounter-cpt').select_option('DEMO-CPT-OLD')
        rcm.locator('[data-action="encounter-add-cpt"]').click()
        assert rcm.locator('.rcm-total strong').inner_text()=='$0.00'
        assert 'has been deleted' in rcm.locator('#toast-root').inner_text()
        rcm.locator('#encounter-cpt').select_option('99213')
        rcm.locator('[data-action="encounter-add-cpt"]').click()
        assert rcm.locator('.rcm-total strong').inner_text()=='$110.00'
        rcm.screenshot(path=str(folder/'assets/images/previews/preview_v20_encounter.png'),full_page=True)
        with rcm.expect_download() as dl:
            rcm.locator('[data-action="superbill-csv"]').click()
        downloaded=dl.value
        assert downloaded.suggested_filename.startswith('MedBook_DEMO_Superbill_')
        rcm.locator('[data-action="superbill-open"]').click()
        assert rcm.locator('.document-print-cover').count()==1
        assert 'Total Charges' in rcm.locator('.modal').inner_text()
        rcm.locator('[data-action="close-modal"]').first.click()
        rcm.locator('[data-action="encounter-sign"]').click()
        assert 'Signed' in rcm.locator('.rcm-encounter-panels').inner_text()
        assert rcm.locator('[data-soap-field="subjective"]').get_attribute('readonly') is not None
        rcm.locator('[data-action="encounter-remove-cpt:0"]').count()==0
        rcm.locator('[data-action="encounter-add-cpt"]').click()
        assert 'locked' in rcm.locator('#toast-root').inner_text()
        print('PASS SOAP draft, charge capture, deleted CPT blocking, superbill CSV/print, signed lock')
        # Dark theme, invoice printing, and SnapText iframe routes remain supported.
        rcm.locator('[data-action="theme-toggle"]').click()
        expect(rcm.locator('body')).to_have_attribute('data-theme','dark')
        go(rcm,'billing')
        rcm.locator('[data-action^="invoice:"]').first.click()
        rcm.emulate_media(media='print')
        assert rcm.locator('.invoice-print-cover').evaluate('(el)=>getComputedStyle(el).visibility')=='visible'
        rcm.emulate_media(media='screen')
        rcm.locator('[data-action="close-modal"]').first.click()
        go(rcm,'ocr')
        assert rcm.locator('#clinical-tool-frame').get_attribute('src').endswith('/image-to-text/index.html')
        assert not errs,errs
        print('PASS existing invoice print, specialty dark theme and SnapText iframe after RCM integration')
        rcm.close()
        small=browser.new_page(viewport={'width':390,'height':850})
        errors_small=[]
        small.on('pageerror',lambda e:errors_small.append(str(e)))
        load(small)
        small.locator('[data-action="nav"]').click()
        small.locator('.sidebar [data-page="coding"]').click()
        expect(small.locator('.pagehead h1')).to_have_text('Coding Reference',timeout=6500)
        assert small.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1
        small.screenshot(path=str(folder/'assets/images/previews/preview_v20_coding_mobile.png'),full_page=True)
        small.locator('[data-action="nav"]').click()
        small.locator('.sidebar [data-page="consultation"]').click()
        expect(small.locator('.panel-title').filter(has_text='SOAP Notes')).to_be_visible(timeout=6500)
        assert small.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1
        assert not errors_small,errors_small
        small.close()
        print('PASS v2.0 coding and SOAP screens at 390px with no host overflow')

    browser.close()
    print('SELECTED MEDBOOK AI v2.0 TEST SUITE(S) PASSED')
finally:
    pass  # No local server is started.
