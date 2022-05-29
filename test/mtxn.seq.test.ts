import log4js from "log4js";
import { FunctionContext, MultiTxnMngr, Task } from "multiple-transaction-manager";
import { Sequelize, INTEGER, STRING, Model } from "sequelize";
import { describe, test, beforeAll, expect, afterAll } from '@jest/globals';
import { SeqDBContext } from "../src/index";

log4js.configure({
    appenders: { 'out': { type: 'stdout' } },
    categories: { default: { appenders: ['out'], level: 'debug' } }
});
const logger = log4js.getLogger();

const sequelize = new Sequelize('sqlite::memory:', { logging: false });
const Student = sequelize.define("Student", {
    id: {
        type: INTEGER,
        primaryKey: true
    },
    name: {
        type: STRING,
    }
});



describe("Multiple transaction manager Sequelize workflow test...", () => {

    beforeAll(async () => {
        global.console = require('console');
        await sequelize.sync({ force: true });
    });


    test("Function task example", async () => {

        // init manager
        const txnMngr: MultiTxnMngr = new MultiTxnMngr();

        const seqContext = new SeqDBContext(sequelize);

        // Add first step
        seqContext.addTask(txnMngr, "DELETE FROM Students");

        // Add second step
        seqContext.addTask(
            txnMngr,
            "INSERT INTO Students(id, name, createdAt, updatedAt) VALUES ($id, $name, date(), date())",
            { "id": 1, "name": "Dave" }
        );

        // Add second step
        seqContext.addFunctionTask(txnMngr,
            (sequelize, txn, task) => {
                return new Promise<any | undefined>((resolve, reject) => {
                    Student.create(
                        { id: 2, name: "Kevin" },
                        { transaction: txn }
                    ).then((newUser) => {
                        resolve(newUser)
                    }).catch((err) => {
                        reject(err);
                    });
                });
            });

        // Enable this if you want to test rollback scenario...
        /* **************** 
        seqContext.addTask(
            txnMngr,
            "INSERT INTO Students(id, name, createdAt, updatedAt) VALUES ($id, $name, date(), date())",
            { "id": 1, "name": "Bob" }
        );
        *************** */

        // Add control step
        seqContext.addTask(txnMngr, "SELECT * FROM Students");

        const tasks: Task[] = await txnMngr.exec();

        expect(tasks[3].getResult().results[1]["name"]).toEqual("Kevin");
    });


    afterAll(async () => { await sequelize.close() });

});