
from pathlib import Path
from playwright.sync_api import sync_playwright

errors=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><div id="toast-root" aria-live="polite"></div></body></html>')
    page.add_style_tag(content=Path('styles.css').read_text())
    page.add_script_tag(content=Path('app.js').read_text())
    # Practice create, edit, view and delete
    page.locator('.sidebar [data-page="practices"]').click()
    page.wait_for_timeout(550)
    page.locator('[data-action="practice-add"]').click()
    page.locator('#form-practice [name="name"]').fill('Test Family Practice')
    page.locator('#form-practice [name="branch"]').fill('Test Family Branch')
    page.locator('button[form="form-practice"]').click()
    assert 'Test Family Practice' in page.locator('.practice-grid').inner_text()
    pid = page.evaluate('() => window.__lastPracticeId')
    assert pid, 'Practice creation did not expose a new ID'
    page.locator(f'[data-action="practice-edit:{pid}"]').click()
    page.locator('#form-practice [name="name"]').fill('Test Family Practice Updated')
    page.locator('#form-practice [name="branch"]').fill('Test Family Branch Updated')
    page.locator('button[form="form-practice"]').click()
    assert 'Test Family Practice Updated' in page.locator('.practice-grid').inner_text()
    page.locator(f'[data-action="practice-view:{pid}"]').click()
    assert 'Practice Profile' in page.locator('.modal').inner_text()
    page.locator('[data-action="close-modal"]').first.click()
    # Assign a provider to the new practice, then verify safe delete / reassignment.
    page.locator('.sidebar [data-page="providers"]').click()
    page.wait_for_timeout(550)
    provider_action = page.locator('.table tbody [data-action^="provider-edit:"]').first.get_attribute('data-action')
    assert provider_action, 'No provider edit action found'
    provider_id = provider_action.split(':', 1)[1]
    page.locator(f'[data-action="provider-edit:{provider_id}"]').click()
    page.locator('#form-provider-edit [name="branch"]').select_option('Test Family Branch Updated')
    page.locator('button[form="form-provider-edit"]').click()
    page.locator('.sidebar [data-page="practices"]').click()
    page.wait_for_timeout(550)
    page.locator(f'[data-action="practice-delete:{pid}"]').click()
    assert page.locator('#form-practice-delete').count()==1
    page.locator('#form-practice-delete [name="targetBranch"]').select_option('Main Clinic')
    page.locator('button[form="form-practice-delete"]').click()
    assert 'Test Family Practice Updated' not in page.locator('.practice-grid').inner_text()
    # Provider taxonomy editable
    page.locator('.sidebar [data-page="providers"]').click()
    page.wait_for_timeout(550)
    assert 'PROVIDER TAXONOMY' in page.locator('.table thead').inner_text()
    page.locator(f'[data-action="provider-edit:{provider_id}"]').click()
    page.locator('#form-provider-edit [name="taxonomyCode"]').fill('207Q00000X')
    page.locator('button[form="form-provider-edit"]').click()
    assert '207Q00000X' in page.locator('.table').inner_text()
    # Complete patient registration
    page.locator('.sidebar [data-page="patients"]').click()
    page.wait_for_timeout(550)
    page.locator('[data-action="new-patient"]').click()
    page.locator('#form-patient-intake [name="name"]').fill('Test Patient')
    page.locator('#form-patient-intake [name="dob"]').fill('1990-01-01')
    page.locator('#form-patient-intake [name="phone"]').fill('+1 555 123 4567')
    page.locator('#form-patient-intake [name="city"]').fill('Test City')
    page.locator('#form-patient-intake [name="email"]').fill('test@example.invalid')
    page.locator('#form-patient-intake [name="notice"]').check()
    page.locator('button[form="form-patient-intake"]').click()
    assert 'Test Patient' in page.locator('.drawer').inner_text()
    assert 'Test City' in page.locator('.drawer').inner_text()
    page.locator('[data-action^="demographics:"]').click()
    assert page.locator('.document-print-cover').count()==1
    assert 'Emergency Contact' in page.locator('.modal').inner_text()
    page.locator('[data-action="close-modal"]').first.click()
    page.locator('[data-action="close-drawer"]').click()
    # Encounter selection and superbill filtered by practice / doctor
    page.locator('.sidebar [data-page="encounters"]').click()
    page.wait_for_timeout(550)
    assert page.locator('.pagehead h1').inner_text()=='Encounters'
    assert page.locator('[data-action^="encounter-open:"]').count()>0
    page.locator('.sidebar [data-page="superbills"]').click()
    page.wait_for_timeout(550)
    assert page.locator('#superbill-practice').count()==1
    assert page.locator('#superbill-doctor').count()==1
    page.locator('#superbill-practice').select_option('Main Clinic')
    page.wait_for_timeout(100)
    assert page.locator('.table tbody tr').count()>0
    with page.expect_download() as download:
        page.locator('[data-action="superbill-register-csv"]').click()
    assert 'Superbill_Register' in download.value.suggested_filename
    page.locator('[data-action="superbill-batch-open"]').click()
    assert page.locator('.document-print-cover').count()==1
    page.locator('[data-action="close-modal"]').first.click()
    # Appointment detail, practice and doctor summaries
    page.locator('.sidebar [data-page="reports"]').click()
    page.wait_for_timeout(550)
    page.locator('[data-action="report-select:appointments"]').click()
    page.locator('[data-action="report-generate"]').click()
    page.wait_for_timeout(950)
    with page.expect_download() as download:
        page.locator('[data-action="report-download"]').click()
    assert 'appointments' in download.value.suggested_filename
    page.locator('[data-action="report-select:doctor-appointments"]').click()
    assert page.locator('.panel-title').filter(has_text='Doctor-wise appointment summary').count()==1
    assert not errors,errors
    browser.close()
print('PASS v2.1 practice CRUD, provider taxonomy, patient demographics, encounter navigation, filtered superbills and appointment reports')
