const nodemailer = require('nodemailer');
const { nodeMailer: { transports } = {} } = require('@istex/config-component').get(module);

module.exports.sendErrorMail = sendErrorMail;
module.exports.getEtherealTransport = getEtherealTransport;

async function sendErrorMail (
  { to = [], subject = '', text = '' } = {},
  { transport = transports.default } = {},
) {
  const transporter = nodemailer.createTransport(transport);

  const info = await transporter.sendMail({
    from: 'istex-jobs@inist.fr',
    to: to.join(','),
    subject,
    text,
  });

  return info;
}

async function getEtherealTransport () {
  const testAccount = await nodemailer.createTestAccount();
  return {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  };
}
