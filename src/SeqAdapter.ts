import log4js from "log4js";
import { Context, MultiTxnMngr, Task } from "multiple-transaction-manager";
import { Sequelize, Transaction } from "sequelize";
import { v1 } from "uuid";

class SeqDBContext implements Context {

    sequilize: Sequelize;
    txn: Transaction | undefined = undefined;
    contextId: string;
    logger = log4js.getLogger("MultiTxnMngr");

    constructor(sequilize: Sequelize) {
        this.sequilize = sequilize;
        this.contextId = v1();
    }

    init(): Promise<Context> {
        return new Promise((resolve, reject) => {
            if (this.isInitialized()) {
                reject("Context already initialised.");
            } else {
                this.sequilize.transaction().then((t) => {
                    this.txn = t;
                    resolve(this);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    commit(): Promise<Context> {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) {
                reject("Cannot commit. Context not initialised.");
            } else {
                this.txn?.commit().then(_ => {
                    this.logger.debug(this.getName() + " is committed.");
                    this.txn = undefined;
                    resolve(this)
                }).catch((err) => {
                    reject(err);
                })
            }
        });
    }

    rollback(): Promise<Context> {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) {
                reject("Cannot rollback. Context not initialised.");
            } else {
                this.txn?.rollback().then(_ => {
                    this.logger.debug(this.getName() + " is rollbacked.");
                    this.txn = undefined;
                    resolve(this)
                }).catch((err) => {
                    reject(err);
                })
            }
        });
    }

    isInitialized(): boolean {
        return this.txn != undefined;
    }

    getName(): string {
        return "Sequilize DB Context: " + this.contextId;
    }

    getTransaction(): Transaction {
        if (!this.txn)
            throw new Error("Transaction not initialised!");
        return this.txn;
    }

    addTask(txnMngr: MultiTxnMngr, querySql: string, params?: unknown | undefined): Task {
        const task = new SeqDBTask(this, querySql, params, undefined);
        txnMngr.addTask(task);
        return task;
    }

    addFunctionTask(txnMngr: MultiTxnMngr,
        execFunc: ((sequilize: Sequelize, txn: Transaction, task: Task) => Promise<unknown | undefined>) | undefined): Task {
        const task = new SeqDBTask(this, "", undefined, execFunc);
        txnMngr.addTask(task);
        return task;
    }
}

class SeqDBTask implements Task {
    params: unknown;
    context: SeqDBContext;
    querySql: string;
    rs: unknown | undefined; // [results, metadata]
    execFunc: ((sequilize: Sequelize, txn: Transaction, task: Task) => Promise<unknown | undefined>) | undefined;

    constructor(context: SeqDBContext,
        querySql: string,
        params: unknown,
        execFunc: ((sequilize: Sequelize, txn: Transaction, task: Task) => Promise<unknown | undefined>) | undefined) {
        this.context = context;
        this.querySql = querySql;
        if (params)
            this.params = params;
        if (execFunc)
            this.execFunc = execFunc;
    }

    getContext(): SeqDBContext {
        return this.context;
    }

    exec(): Promise<Task> {
        return new Promise<Task>((resolveTask, rejectTask) => {
            if (this.execFunc) {
                this.execFunc(this.getContext().sequilize, this.getContext().getTransaction(), this).then((res) => {
                    this.rs = res;
                    resolveTask(this);
                }).catch((err) => {
                    rejectTask(err);
                });
            } else {
                let params;
                if (this.params) {
                    if (this.params instanceof Function)
                        params = this.params();
                    else
                        params = this.params;
                }
                this.getContext().sequilize
                    .query(this.querySql, { bind: params, transaction: this.getContext().getTransaction() }).then(([results, metadata]) => {
                        this.rs = { results, metadata };
                        resolveTask(this);
                    }).catch((err) => {
                        rejectTask(err);
                    });
            }
        });
    }

    setParams(params: unknown) {
        this.params = params;
    }

    getResult(): unknown | undefined {
        return this.rs;
    }

}

export { SeqDBContext, SeqDBTask };

