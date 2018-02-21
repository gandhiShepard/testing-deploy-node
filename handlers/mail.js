const nodeMailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

// now we need to create a transport for sending email via smtp
const transport = nodeMailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => {
  const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
  const inlined = juice(html);
  //console.log(html);
  return inlined;
}


// example
// transport.sendMail({
//   from: 'Ben <benjamin@solvm.com>',
//   to: 'ben@example.mail',
//   subject: 'Just sendin stuff',
//   html: 'Hello <strong>again</strong>',
//   text: 'Hello **again**'
// });

exports.send = async (options) => {
  const html = generateHTML(options.filename, options);
  const text = htmlToText.fromString(html);

  const mailOptions = {
    from: `Ben <benjamin@solvm.com>`,
    to: options.user.email,
    subject: options.subject,
    html: html,
    text: text
  };
  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions);
}


