const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Partner = require('../models/Partner');
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
        notes
      } = req.body;
  
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
        notes
      });
  
      await partner.save();
  
      res.status(201).json({
        message: 'Partner created successfully',
        data: partner
      });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };




