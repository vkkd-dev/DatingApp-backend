const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;
const cors = require('cors');

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Chat = require('./models/message');

mongoose
  .connect('mongodb+srv://vkd:vkd420@cluster0.zznszjh.mongodb.net/')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(error => {
    console.log('Error connecting MongoDB', error);
  });

app.listen(port, () => {
  console.log('Server is running on ', port);
});

// endpoints to register
app.post('/register', async (req, res) => {
  try {
    const {name, email, password} = req.body;

    //check if the email is already registered
    const existingUser = await User.findOne({email});
    if (existingUser) {
      console.log('Email already registered');
      return res.status(400).json({message: 'Email already registered'});
    }

    //create a new User
    const newUser = new User({
      name,
      email,
      password,
    });

    //generate the verification token
    newUser.verificationToken = crypto.randomBytes(20).toString('hex');

    //save the user to the database
    await newUser.save();

    //send the verification email to the registered user
    // sendVerificationEmail(newUser.email, newUser.verificationToken);

    return res
      .status(200)
      .json({message: 'User registered successfully', userId: newUser._id});
  } catch (error) {
    console.log('Error registering user', error);
    res.status(500).json({message: 'Registration failed'});
  }
});

const sendVerificationEmail = async (email, verificationToken) => {
  const transpoter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vargabdas@gmail.com',
      pass: 'gfvxqwppgqlqtnsi',
    },
  });

  const mailOptions = {
    from: 'vargabdas@gmail.com',
    to: email,
    subject: 'Email verification',
    text: `Please click on the following link to verify your email : http://192.168.1.34:3000/verify/${verificationToken}`,
  };

  //send the mail
  try {
    await transpoter.sendMail(mailOptions);
  } catch (error) {
    console.log('Error sending the verification email', error);
  }
};

//verify the user
app.get('/verify/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({verificationToken: token});
    if (!user) {
      return res.status(404).json({message: 'Invalid verification token'});
    }

    //mark the user as verified
    user.verified = true;
    user.verificationToken = undefined;

    //save in the backend
    await user.save();

    res.status(200).json({message: 'Email verified successfully'});
  } catch (error) {
    console.log('Error verifying', error);
    res.status(500).json({message: 'Email verification failed'});
  }
});

const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString('hex');
  return secretKey;
};

const secretKey = generateSecretKey();

//endpoint to login
app.post('/login', async (req, res) => {
  try {
    const {email, password} = req.body;

    //check if the user exists already
    const user = await User.findOne({email});
    if (!user) {
      return res.status(401).json({message: 'Invalid email or password'});
    }

    //check in password is correct
    if (user.password !== password) {
      return res.status(401).json({message: 'Invalid password'});
    }

    const token = jwt.sign({userId: user._id}, secretKey);

    res
      .status(200)
      .json({message: 'Login successful', token: token, userId: user._id});
  } catch (error) {
    res.status(500).json({message: 'Login failed'});
  }
});

//endpoint to set/change gender
app.put('/users/:userId/gender', async (req, res) => {
  try {
    const {userId} = req.params;
    const {gender} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {gender: gender},
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res.status(200).json({message: 'User gender updated Successfully'});
  } catch (error) {
    res.status(500).json({message: 'Error updating user gender', error});
  }
});

//endpoint to fetch user data
app.get('/users/:userId', async (req, res) => {
  try {
    const {userId} = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res.status(200).json({user});
  } catch (error) {
    console.log('error: ', error);
    res.status(500).json({message: 'Failed to fetch user data'});
  }
});

//endpoints to update user description
app.put('/users/:userId/description', async (req, res) => {
  try {
    const {userId} = req.params;
    const {description} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {description: description},
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res
      .status(200)
      .json({message: 'User description updated successfully'});
  } catch (error) {
    res.status(500).json({message: 'Error updating user description', error});
    console.log('error: ', error);
  }
});

//endpoint to update username
app.put('/users/:userId/name', async (req, res) => {
  try {
    const {userId} = req.params;
    const {name} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {name: name},
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res.status(200).json({message: 'Username has been updated'});
  } catch (error) {
    res.status(500).json({message: 'Error is updating the username', error});
    console.log('error: ', error);
  }
});

//endpoint to add turn-ons
app.put('/users/:userId/turn-ons/add', async (req, res) => {
  try {
    const {userId} = req.params;
    const {turnOns} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {$addToSet: {turnOns: turnOns}},
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res.status(200).json({message: `${turnOns} added`});
  } catch (error) {
    res.status(500).json({message: 'Failed to update turn-ons', error});
    console.log('error:', error);
  }
});

//endpoint to remove turn-ons
app.put('/users/:userId/turn-ons/remove', async (req, res) => {
  try {
    const {userId} = req.params;
    const {turnOns} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {$pull: {turnOns: turnOns}},
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res.status(200).json({message: `${turnOns} removed`});
  } catch (error) {
    res.status(500).json({message: 'Failed to update turn-ons', error});
    console.log('error:', error);
  }
});

//endpoint for adding looking for
app.put('/users/:userId/looking-for/add', async (req, res) => {
  try {
    const {userId} = req.params;
    const {lookingFor} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {$addToSet: {lookingFor: lookingFor}},
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res.status(200).json({message: `${lookingFor} added.`});
  } catch (error) {
    console.log('error: ', error);
    res.status(500).json({message: 'Failed to add ', error});
  }
});

//endpoint for removing looking for
app.put('/users/:userId/looking-for/remove', async (req, res) => {
  try {
    const {userId} = req.params;
    const {lookingFor} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {$pull: {lookingFor: lookingFor}},
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    return res.status(200).json({message: `${lookingFor} removed.`});
  } catch (error) {
    console.log('error: ', error);
    res.status(500).json({message: 'Failed to remove ', error});
  }
});

//endpoint for uploading image gallery
app.post('/users/:userId/profile-gallery/add', async (req, res) => {
  try {
    const {userId} = req.params;
    const {imagesUrl} = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({message: 'User not found!'});
    }

    user.profileImages.push(imagesUrl);
    await user.save();

    return res.status(200).json({message: 'Image added to profile gallery.'});
  } catch (error) {
    console.log('error: ', error);
    res.status(500).json({message: 'Error uploading image.'});
  }
});

//endpoint to remove image from profile gallery
app.put('/users/:userId/profile-gallery/remove', async (req, res) => {
  try {
    const {userId} = req.params;
    const {imagesUrl} = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: {profileImages: imagesUrl},
      },
      {new: true},
    );

    if (!user) {
      return res.status(404).json({message: 'No user'});
    }

    return res.status(200).json({message: 'Image removed'});
  } catch (error) {
    res.status(500).json({message: 'Error removing image. ', error});
  }
});

//endpoint to fetch all profiles
app.get('/profiles', async (req, res) => {
  const {userId, gender, turnOns, lookingFor} = req.query;

  try {
    let filter = {gender: gender === 'male' ? 'female' : 'male'}; // For gender filtering

    // Add filtering based on turnOns and lookingFor arrays
    if (turnOns) {
      filter.turnOns = {$in: turnOns};
    }

    if (lookingFor) {
      filter.lookingFor = {$in: lookingFor};
    }

    const currentUser = await User.findById(userId)
      .populate('matches', '_id')
      .populate('crushes', '_id');

    // Extract IDs of friends
    const friendIds = currentUser.matches.map(friend => friend._id);

    // Extract IDs of crushes
    const crushIds = currentUser.crushes.map(crush => crush._id);

    const profiles = await User.find(filter)
      .where('_id')
      .nin([userId, ...friendIds, ...crushIds]);

    return res.status(200).json({profiles});
  } catch (error) {
    return res.status(500).json({message: 'Error fetching profiles', error});
  }
});

//endpoint to receive like
app.post('/like-user', async (req, res) => {
  try {
    const {currentUserId, selectedUserId} = req.body;

    const currentUser = await User.findByIdAndUpdate(selectedUserId, {
      $push: {receivedLikes: currentUserId},
    });

    const selectedUser = await User.findByIdAndUpdate(currentUserId, {
      $push: {crushes: selectedUserId},
    });

    if (!currentUser) {
      return res.status(404).json({message: 'Current user not found!'});
    }

    if (!selectedUser) {
      return res.status(404).json({message: 'Selected user not found!'});
    }

    return res.status(200).json({message: 'User updated'});
  } catch (error) {
    console.log('Error liking user', error);
    res.status(500).json({message: 'Failed to update user.'});
  }
});

//endpoint to received likes profile data
app.get('/received-likes/:userId', async (req, res) => {
  try {
    const {userId} = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({message: 'User not found!'});
    }

    const receivedLikesData = [];
    for (const likedUserId of user.receivedLikes) {
      const likedUser = await User.findById(likedUserId);
      if (likedUser) {
        receivedLikesData.push(likedUser);
      }
    }

    res.status(200).json({receivedLikesData});
  } catch (error) {
    res
      .status(500)
      .json({message: 'Error fetching received likes data.', error});
    console.log(error);
  }
});

app.post('/create-match', async (req, res) => {
  try {
    const {currentUserId, selectedUserId} = req.params;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: {receivedLikes: selectedUserId},
      $push: {matches: selectedUserId},
    });

    await User.findByIdAndUpdate(selectedUserId, {
      $push: {matches: currentUserId},
      $pull: {crushes: currentUserId},
    });

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({message: 'Failed to create match.'});
    console.log(error);
  }
});

//endpoint to fetch matches  of a particular user
app.get('/fetch-matches/:userId', async (req, res) => {
  try {
    const {userId} = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({message: 'User not found!'});
    }

    const matchedIds = user.matches;

    const matches = await User.find({_id: {$in: matchedIds}});

    res.status(200).json({matches});
  } catch (error) {
    console.log('error: ', error);
  }
});
