const express = require('express');
const router = express.Router();

const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

const {catchErrors} = require('../handlers/errorHandlers');

// Homepage
router.get('/', storeController.getStores);

// StoreS routes
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/:id/edit', catchErrors(storeController.editStore))

// Stores Pagination
router.get('/stores/page/:page', catchErrors(storeController.getStores));

// Store route
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

// Add routes
router.get('/add', authController.isLoggedIn, storeController.addStore);

router.post('/add', 
  storeController.upload, 
  catchErrors(storeController.resize), 
  catchErrors(storeController.createStore));
router.post('/add/:id', 
  storeController.upload, 
  catchErrors(storeController.resize), 
  catchErrors(storeController.updateStore));


// Tag routes
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));


// Login routes
router.get('/login', userController.loginForm)
router.post('/login', authController.login)

// logout
router.get('/logout', authController.logout)

// Register routes
router.get('/register', userController.registerForm)

// validate register data
// register the user
// need to log them in
router.post('/register', 
  userController.validateRegister,
  userController.register,
  authController.login)



// account routes
router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));

router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset))
router.post('/account/reset/:token', 
  authController.confirmedPasswords, 
  catchErrors(authController.update));


// map
router.get('/map', storeController.mapPage);

// hearts
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));

// Reviews
router.post('/reviews/:id', 
  authController.isLoggedIn, 
  catchErrors(reviewController.addReview));

// top stores
router.get('/top', catchErrors(storeController.getTopStores));



// API endpoints

router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));

module.exports = router;