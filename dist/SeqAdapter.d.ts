import log4js from "log4js";
import { Context, MultiTxnMngr, Task } from "multiple-transaction-manager";
import { Sequelize, Transaction } from "sequelize";
declare class SeqDBContext implements Context {
    sequilize: Sequelize;
    txn: Transaction | undefined;
    contextId: string;
    logger: log4js.Logger;
    constructor(sequilize: Sequelize);
    init(): Promise<Context>;
    commit(): Promise<Context>;
    rollback(): Promise<Context>;
    isInitialized(): boolean;
    getName(): string;
    getTransaction(): Transaction;
    addTask(txnMngr: MultiTxnMngr, querySql: string, params?: any | undefined): void;
    addFunctionTask(txnMngr: MultiTxnMngr, execFunc: ((sequilize: Sequelize, txn: Transaction, task: Task) => Promise<any | undefined>) | undefined): void;
}
declare class SeqDBTask implements Task {
    params: any;
    context: SeqDBContext;
    querySql: string;
    rs: any | undefined;
    execFunc: ((sequilize: Sequelize, txn: Transaction, task: Task) => Promise<any | undefined>) | undefined;
    constructor(context: SeqDBContext, querySql: string, params: any, execFunc: ((sequilize: Sequelize, txn: Transaction, task: Task) => Promise<any | undefined>) | undefined);
    getContext(): SeqDBContext;
    exec(): Promise<Task>;
    setParams(params: any): void;
    getResult(): any | undefined;
}
export { SeqDBContext, SeqDBTask };
