const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail')

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login',
  successRedirect: '/',
  successFlash: 'You are now logged in'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  // 1, is user authenticated
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.flash('error', 'Oops, you must be logged in to add a store');
  res.redirect('/login');
}

exports.forgot = async (req, res) => {
  // 1, see it a user with that email exists
  const user = await User.findOne({ email: req.body.email});
  if (!user) {
    // Use this message instead of telling them that the email doesn't exist
    req.flash('error', 'A password reset has been mailed to you');
    return res.redirect('/login');
  }
  // 2, set reset token and expiry on theri account
  // if there is a user
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();
  // 3, send an email with the token
  const resetURL = `http://${req.headers.host}.account/reset/${user.resetPasswordToken}`;
  
  await mail.send({
    user: user,
    subject: 'Password reset',
    resetURL: resetURL,
    filename: 'password-reset'
  });
  req.flash('success', `You have been emaild a reset passwprd link.`);
  // 4, redirect to login page
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {$gt: Date.now()}
  });
  if (!user) {
    req.flash('error', 'password reset is invalid of has expired');
    return res.redirect('/login');
  }
  // if there is a user, show the rest password form
  //console.log(user);
  res.render('reset', {title: 'Reset your password'});
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match');
  res.redirect('back');
}

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {$gt: Date.now()}
  });
  if (!user) {
    req.flash('error', 'password reset is invalid of has expired');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  // clear reset data
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  // save user
  const updatedUser = await user.save();
  // log them in
  await req.login(updatedUser);
  req.flash('success', 'Password has been reset');
  res.redirect('/');

}