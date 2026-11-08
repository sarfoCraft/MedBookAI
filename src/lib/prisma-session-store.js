const session = require('express-session');

class PrismaSessionStore extends session.Store {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  get(sid, callback) {
    this.prisma.session.findUnique({ where: { sid } })
      .then(async (row) => {
        if (!row || row.expiresAt <= new Date()) {
          if (row) await this.prisma.session.deleteMany({ where: { sid } });
          callback(null, null);
          return;
        }
        const data = { ...row.data };
        if (data.cookie?.expires) data.cookie = { ...data.cookie, expires: new Date(data.cookie.expires) };
        callback(null, data);
      })
      .catch(callback);
  }

  set(sid, sess, callback = () => {}) {
    const cookieExpiry = sess?.cookie?.expires ? new Date(sess.cookie.expires) : null;
    const maxAge = Number(sess?.cookie?.maxAge) || 8 * 60 * 60 * 1000;
    const expiresAt = cookieExpiry || new Date(Date.now() + maxAge);
    const serializable = JSON.parse(JSON.stringify(sess));
    this.prisma.session.upsert({
      where: { sid },
      create: { sid, userId: sess?.userId || null, data: serializable, expiresAt },
      update: { userId: sess?.userId || null, data: serializable, expiresAt }
    }).then(() => callback(null)).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    this.prisma.session.deleteMany({ where: { sid } })
      .then(() => callback(null)).catch(callback);
  }

  touch(sid, sess, callback = () => {}) {
    const cookieExpiry = sess?.cookie?.expires ? new Date(sess.cookie.expires) : null;
    const maxAge = Number(sess?.cookie?.maxAge) || 8 * 60 * 60 * 1000;
    const expiresAt = cookieExpiry || new Date(Date.now() + maxAge);
    this.prisma.session.updateMany({ where: { sid }, data: { expiresAt } })
      .then(() => callback(null)).catch(callback);
  }
}

module.exports = { PrismaSessionStore };
