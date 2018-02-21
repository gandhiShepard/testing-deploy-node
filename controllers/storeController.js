const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const User = mongoose.model('User');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    }
    else {
      next({message: 'That filetype is not allowed!'}, false);
    }
  }
}

exports.homePage = (req, res) => {
  console.log(req.name);

  res.render('index');
}

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store'})
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if ther eis no new file to resize
  if (!req.file) {
    next(); // skip to next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once written to file system, keep going
  next();
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  // console.log(req.body);
  const store = await (new Store(req.body)).save();
  //await store.save();
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`)
  res.redirect(`/store/${store.slug}`);
  console.log('It worked');
}

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = (page * limit) - limit;
  // 1*4 = 4 // -4 = 0 // no skip on homepage
  // 2*4 = 8 // -4 = 4 // skip first 4 for page 2

  // First, we need to query db for a list of all the stores
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({created: 'desc'});
  
  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  // Ceil will give us the UPPER bounds. if we have 17 pages instead of 16.
  const pages = Math.ceil(count / limit);
  if(!stores.length && skip) {
    req.flash('info', `hey, you asked for page ${page}. but that doesn't exist. So i put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render('stores', {title: 'Stores', stores, page, pages, count})
}

exports.getStoreBySlug = async (req, res, next) => {
  // query db for store
  // if we use the .populate method we can get relaitonal data too!
  const store = await Store.findOne({slug: req.params.slug}).populate('author reviews');
  if(!store) {
    next();
    return;
  }
  res.render('store', {title: store.name, store})
}


const confirmOwner = (store, user) => {
  // Use this to set up an Admin level one day
  if (!store.author.equals(user._id) || user.level > 11) {
    throw Error('You must own a store in order to edit it!');
  }
}


exports.editStore = async (req, res) => {
  // First, find store ID
  const store = await Store.findOne({_id: req.params.id});
  //res.json(store)
  // two, confirm ther are the owner of the store
  confirmOwner(store, req.user);
  // three, render out edit form
  res.render('editStore', {title: `Edit ${store.name}`, store})
}

exports.updateStore = async (req, res) => {
  // set the location data to be a point
  req.body.location.type = 'Point';
  // 1, need to find and update store
  const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
    new: true, // return new store instead of old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated <strong>${store.name}</strong> <a href="/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
  // 2, redirect them the store and tell it worked
}

exports.getStoresByTag = async (req, res, next) => {
  const tag = req.params.tag;
  const tagQuery = tag || {$exists: true}
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({tags: tagQuery});
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', {title: 'Tags', tags, tag, stores});
}

exports.searchStores = async (req, res) => {
  const stores = await Store
  // find stores
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: {$meta: 'textScore'}
  })
  // sort stores
  .sort({
    score: {$meta: 'textScore'}
  })
  // limit to top 5 results
  .limit(5);

  res.json(stores);
}

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: 10000 //10km
      }
    }
  };

  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  res.json(stores);
}


exports.mapPage = (req, res) => {
  res.render('map', {title: 'Map'});
}

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findOneAndUpdate(req.user._id,
      {[operator] : {hearts: req.params.id}},
      {new: true}
    );
  res.json(user);
}

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts}
  });
  res.render('stores', {title: 'Hearted Stores', stores})
}


exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', {stores, title: 'Top Stores!'});
  //res.json(stores);
}