import { Request, Response, request } from 'express';
import {Customer} from "../structure/customer";
import {Pagarme} from "../structure/pagarme";

import * as _ from "lodash";
const mongodb = require('../../../helpers/mongodb');
const logger = require('../../../helpers/logger');
export class OrderController{
    public customer: Customer = new Customer();
    public pagarme: Pagarme = new Pagarme();

    public async index(req: Request, res: Response){
        try {
            const list = await mongodb.find('order', req.query);

            logger.log('Mauricio->', list);
            return res.json(list);
        } catch (e) {
            return res.status(400).json({message: "Ops... Ocorreu um erro!", error: e.message});
        }
    }

    public async save(req: Request, res: Response){
        try {
            req.body.status = 'PENDING';
            const save = await mongodb.save('order', req.body);
            return res.json(save);
        } catch (e) {
            return res.status(400).json({message: "Ops... Ocorreu um erro!", error: e.message});
        }
    }

    public async delete(req: Request, res: Response){
        try {
            const resDelete = await mongodb.deleteMany('order', {});
            return res.json(resDelete);
        } catch (e) {
            return res.status(400).json({message: "Ops... Ocorreu um erro!", error: e.message});
        }
    }

    public async processJob(){
        try {
            const orders = await mongodb.find('order', {status: "PENDING"}, { created: 1}, 1, 10 );

            if(orders.length > 0) {
                const resUpdate = await mongodb.updateManySet('order', {
                    _id: {$in: _.map(orders, '_id')}
                }, {
                    $set: {status: "PROCESSING"}
                })

                if(resUpdate.modifiedCount < orders.length) {
                    throw new Error("Não foi possível processar os registros");
                }

                for(let order of orders) {

                    const customerId = await this.customer.save(order.customer);

                    order.customer.external_id = customerId.toString();

                    const resUpdateCustomerId = await mongodb.updateManySet('order', {
                        _id: order._id
                    }, {
                        $set: {"customer.external_id": customerId}
                    })

                    const pagarme = await this.pagarme.transaction(order);
                    
                    const resUpdate = await mongodb.updateManySet('order', {
                        _id: order._id
                    }, {
                        $set: {status: "PROCESSED", pagarme}
                    })
                }
            }
            return true;
        } catch (e) {
            return false
        }
    }

    public async postback(req: Request, res:Response){
        try{
            const list = await mongodb.find('order', {_id: mongodb.genObjectId(req.query.id)});
            if(list.length){
                const order = list[0];
                if(!order.pagarme){
                    order.pagarme = {};
                }
                if(!order.pagarme.postbacks){
                    order.pagarme.postbacks = [];
                }
        
                order.pagarme.postbacks.push(req.body);
        
                const result = await mongodb.updateManySet('order', {_id: order._id}, {$set: {"pagarme.postbacks": order.pagarme.postbacks}});
            }
            res.json({})
        } catch(e){
            res.status(400).json({});
        }
        
    }
}