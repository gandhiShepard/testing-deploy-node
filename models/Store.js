const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  toJSON: {virtuals: true},
  toObject: {virtuals: true}
});

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next(); //skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);
  // find other stores what have the same name
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if(storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`
  }

  next();
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({
  location: '2dsphere'
});


storeSchema.statics.getTagsList = function() {
  // all of the methods are bound to the model
  return this.aggregate([
    {$unwind: '$tags'},
    {$group: {_id: '$tags', count: { $sum: 1}}},
    {$sort: {count: -1}}
  ]);
}


storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // look up stores and populate reviews
    {$lookup: {
      from: 'reviews', 
      localField: '_id', 
      foreignField: 'store', 
      as: 'reviews'}
    },
    // filter for items that have 2 or more reviews
    {$match: {
      'reviews.1': {
        $exists: true
      }
    }},
    // add the average reviews field
    {$project: {
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: {$avg: '$reviews.rating'}
    }},
    // sort by new field, highest review first
    { $sort: {
      averageRating: -1
    }},
    // limit to top 10
    {$limit: 10}
  ]);
}

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

// find reviews where the stores _id property === reviews store property
// this is like a join in sql
storeSchema.virtual('reviews', {
  ref: 'Review', // which model to link
  localField: '_id', // which filed on the store
  foreignField: 'store' // which field on the review
});

module.exports = mongoose.model('Store', storeSchema);