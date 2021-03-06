import * as http from "http";
import * as express from "express";
import {Request, Response, NextFunction} from "express";
import * as httpProxy from 'express-http-proxy';
import * as dotenv from 'dotenv';
import * as basicAuth from "express-basic-auth";

const basicAuthMiddleware = require('../middlewares/basicAuth');
const auth = require('../middlewares/auth');

const app = express();
dotenv.config();

const testServiceProxy = httpProxy(`http://localhost:${process.env.TEST_PORT || 3001}`);
const productServiceProxy = httpProxy(`http://localhost:${process.env.PRODUCT_PORT || 3002}`);
const userServiceProxy = httpProxy(`http://localhost:${process.env.USER_PORT || 3003}`);
const stockServiceProxy = httpProxy(`http://localhost:${process.env.STOCK_PORT || 3004}`);
const orderServiceProxy = httpProxy(`http://localhost:${process.env.ORDER_PORT || 3005}`);

// Apidoc
app.use(`/apidoc`, express.static('dist/apidoc'));

app.all(['/test', '/test/*'], auth.verifyJWT, (req: Request, res: Response, next: NextFunction) => {
    testServiceProxy(req, res, next);
});
app.all(['/product', '/product/*'], auth.verifyJWT, (req: Request, res: Response, next: NextFunction) => {
    productServiceProxy(req, res, next);
});

app.all('/user/login', basicAuth({authorizer: basicAuthMiddleware.defaultAuth, authorizeAsync: true}), (req: Request, res: Response, next: NextFunction) => {
    userServiceProxy(req, res, next);
});

app.all(['/user', /^\/user\/(?!login).*$/],  auth.verifyJWT, (req: Request, res: Response, next: NextFunction) => {
    userServiceProxy(req, res, next);
});


app.all(['/stock', '/stock/*'], auth.verifyJWT, (req: Request, res: Response, next: NextFunction) => {
    stockServiceProxy(req, res, next);
});

app.all('/order/pagarme', basicAuth({authorizer: basicAuthMiddleware.defaultAuth, authorizeAsync: true}), (req: Request, res: Response, next: NextFunction) => {
    orderServiceProxy(req, res, next);
});

app.all(['/order',/^\/order\/(?!pagarme).*$/], auth.verifyJWT, (req, res, next) => {
    orderServiceProxy(req, res, next);
});

const server = http.createServer(app);
server.listen(process.env.GATEWAY_PORT || 3000);