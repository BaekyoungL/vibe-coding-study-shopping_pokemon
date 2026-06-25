const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

/* GET /api/admin/stats — 대시보드 통계 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      userTotal,
      userAdmin,
      productTotal,
      productActive,
      productInactive,
      productDiscontinued,
      orderStatusCounts,
      revenueAgg,
      categoryAgg,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'inactive' }),
      Product.countDocuments({ status: 'discontinued' }),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      ]),
      Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Order.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const orders = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      total: 0,
    };
    for (const { _id, count } of orderStatusCounts) {
      if (Object.prototype.hasOwnProperty.call(orders, _id)) orders[_id] = count;
      orders.total += count;
    }

    const productsByCategory = {};
    for (const { _id, count } of categoryAgg) {
      productsByCategory[_id || '기타'] = count;
    }

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: userTotal,
          admin: userAdmin,
          customer: userTotal - userAdmin,
        },
        products: {
          total: productTotal,
          active: productActive,
          inactive: productInactive,
          discontinued: productDiscontinued,
        },
        orders,
        revenue: {
          total: revenueAgg[0]?.total ?? 0,
          paidOrderCount: revenueAgg[0]?.count ?? 0,
        },
        productsByCategory,
        recentOrdersLast7Days: recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
