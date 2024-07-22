const nodemailer = require('nodemailer');





//Create transporter object with SMTP credentials

async function sendEmail(notification, toEmail) {
  let transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: "noreply@orcsolution.com",
      pass: "Suh27071"
    }
  });
  
const expirationTime = new Date();
expirationTime.setHours(expirationTime.getHours() + 24);
  // Message options
  let mailOptions = {
    from: 'noreply@orcsolution.com', // Changed the 'from' field format
    to: toEmail, // This should be the recipient's email address
    subject: notification.title,
    text: notification.title,
    html:notification.html
    
  //   `
  //   <p>
  //     The following link contains the information being requested from "${notification.propertyName}".<br>
  //     The link will expire in 24 Hrs. Once the link is expired, you will need to request another link to be sent.<br>
  //     If you have any questions, please contact your management team at "${notification.propertyName}".<br>
  //     Here is a link: <a href="${notification.redirectUrl}">Client form</a>. Kindly fill out this form.
  //     <br>
  //     <img src="https://dev-proscan.eastus.cloudapp.azure.com/wp-content/uploads/2023/06/cropped-Odyssey-logo-1_313370_.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
  //   </p>
  // `
  
  };
  
  
  // Send email
  let notifyResult = await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      // console.log(error);
    } else {
      // console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = {
  sendEmail
}
