const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Partner = require('../models/Partner');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

const cookieOptions = {
    httpOnly: true,
    secure: true,          // Set to true in production (HTTPS)
    sameSite: 'Strict',    // Or 'Lax' if cross-origin
  };



  exports.create = async (req, res) => {
    try {

      const {
        partnerName,
        contactPerson,
        email,
        phone,
        websiteDomain,
        commissionPercent,
        startDate,
        endDate,
        status,
        callbackUrls,
        endpoints,
        notes,
        password,
        creatorId
      } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

  
      // Check if partner already exists with same email, phone, or websiteDomain
      const existingPartner = await Partner.findOne({
        $or: [
          { email },
          { phone },
          { websiteDomain }
        ]
      });
  
      if (existingPartner) {
        return res.status(400).json({
          error: 'A partner with the same email, phone, or website domain already exists.'
        });
      }
  
      const partner = new Partner({
        partnerName,
        contactPerson,
        email,
        phone,
        websiteDomain,
        commissionPercent,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        callbackUrls,
        endpoints,
        notes,
        creatorId
      });
  
      await partner.save();

          // Create user with hashed password
    const user = new User({
      username: email,       // ✅ Store email in username
      mobile: phone,         // ✅ Store phone in mobile field
      password: hashedPassword, // ✅ Store hashed password
      role: 'partner',
      creatorId
    });

    await user.save();
  
      res.status(201).json({
        message: 'Partner created successfully',
        data: partner
      });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ error: 'Internal Server Error','msg':error.message });
    }
  };

  // Get Partner by ID
exports.getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.status(200).json({ data: partner });
  } catch (error) {
    console.error('Error fetching partner by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get All Partners
exports.getAllPartners = async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 }); // Latest first
    res.status(200).json({ data: partners });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update Partner
exports.updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.email || updates.phone || updates.websiteDomain) {
      const existing = await Partner.findOne({
        _id: { $ne: id },
        $or: [
          { email: updates.email },
          { phone: updates.phone },
          { websiteDomain: updates.websiteDomain }
        ]
      });

      if (existing) {
        return res.status(400).json({
          error: 'Another partner with the same email, phone, or website domain already exists.'
        });
      }
    }

    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const updatedPartner = await Partner.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updatedPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.status(200).json({
      message: 'Partner updated successfully',
      data: updatedPartner
    });
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete Partner
exports.deletePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Partner.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.status(200).json({
      message: 'Partner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Update Partner Status (active, inactive, suspended)
exports.setPartnerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['active', 'inactive', 'suspended'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updatedPartner = await Partner.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedPartner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.status(200).json({
      message: `Partner status updated to ${status}`,
      data: updatedPartner
    });
  } catch (error) {
    console.error('Error updating partner status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Change Partner Password
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: 'Password and confirm password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const salt = await bcrypt.genSalt(10);
    partner.password = await bcrypt.hash(password, salt);

    await partner.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



