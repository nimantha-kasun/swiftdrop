const User = require('../models/User');

// GET /api/users — Admin: paginated list of customers
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ role: 'Customer' })
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'Customer' }),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/deactivate — Admin: toggle account status
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'Admin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate an Admin account.' });
    }

    user.status = user.status === 'active' ? 'deactivated' : 'active';
    await user.save();

    res.json({
      success: true,
      message: `Account ${user.status === 'active' ? 'reactivated' : 'deactivated'} successfully.`,
      user: { id: user._id, name: user.name, email: user.email, status: user.status },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile — Customer: update display name
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, toggleUserStatus, updateProfile };