const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');
const indexRouter = require('./src/routes/index');
const authRouter = require('./src/routes/authRouter');
const userRouter = require('./src/routes/userRouter');
const productRouter = require('./src/routes/productRouter');
const orderRouter  = require('./src/routes/orderRouter');
const cartRouter   = require('./src/routes/cartRouter');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/orders',  orderRouter);
app.use('/api/cart',    cartRouter);
app.use('/api/admin',   require('./src/routes/adminRouter'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
