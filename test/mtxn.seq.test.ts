import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import log4js from "log4js";
import { MultiTxnMngr, Task } from "multiple-transaction-manager";
import { INTEGER, Sequelize, STRING } from "sequelize";
import { SeqDBContext } from "../src/index";

log4js.configure({
    appenders: { 'out': { type: 'stdout' } },
    categories: { default: { appenders: ['out'], level: 'debug' } }
});

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

        // init manager & context
        const txnMngr: MultiTxnMngr = new MultiTxnMngr();
        const seqContext = new SeqDBContext(txnMngr, sequelize);

        // Add first step
        seqContext.addTask("DELETE FROM Students");

        // Add second step
        seqContext.addTask(
            "INSERT INTO Students(id, name, createdAt, updatedAt) VALUES ($id, $name, date(), date())",
            { "id": 1, "name": "Dave" }
        );

        // Add second step
        seqContext.addFunctionTask(
            (_sequelize, txn, _task) => {
                return new Promise<unknown | undefined>((resolve, reject) => {
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
            "INSERT INTO Students(id, name, createdAt, updatedAt) VALUES ($id, $name, date(), date())",
            { "id": 1, "name": "Bob" }
        );
        *************** */

        // Add control step
        const controlTask: Task = seqContext.addTask("SELECT * FROM Students");

        await txnMngr.exec();

        expect(controlTask.getResult().results[1]["name"]).toEqual("Kevin");
    });


    afterAll(async () => { await sequelize.close() });

});