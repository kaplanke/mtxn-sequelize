"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeqDBTask = exports.SeqDBContext = void 0;
const log4js_1 = __importDefault(require("log4js"));
const uuid_1 = require("uuid");
class SeqDBContext {
    constructor(sequilize) {
        this.txn = undefined;
        this.logger = log4js_1.default.getLogger("MultiTxnMngr");
        this.sequilize = sequilize;
        this.contextId = (0, uuid_1.v1)();
    }
    init() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized()) {
                reject("Context already initialised.");
            }
            else {
                this.sequilize.transaction().then((t) => {
                    this.txn = t;
                    resolve(this);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }
    commit() {
        return new Promise((resolve, reject) => {
            var _a;
            if (!this.isInitialized()) {
                reject("Cannot commit. Context not initialised.");
            }
            else {
                (_a = this.txn) === null || _a === void 0 ? void 0 : _a.commit().then(_ => {
                    this.txn = undefined;
                    resolve(this);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }
    rollback() {
        return new Promise((resolve, reject) => {
            var _a;
            if (!this.isInitialized()) {
                reject("Cannot rollback. Context not initialised.");
            }
            else {
                (_a = this.txn) === null || _a === void 0 ? void 0 : _a.rollback().then(_ => {
                    this.txn = undefined;
                    resolve(this);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }
    isInitialized() {
        return this.txn != undefined;
    }
    getName() {
        return "Sequilize DB Context: " + this.contextId;
    }
    getTransaction() {
        if (!this.txn)
            throw new Error("Transaction not initialised!");
        return this.txn;
    }
    addTask(txnMngr, querySql, params) {
        const task = new SeqDBTask(this, querySql, params, undefined);
        txnMngr.addTask(task);
    }
    addFunctionTask(txnMngr, execFunc) {
        const task = new SeqDBTask(this, "", undefined, execFunc);
        txnMngr.addTask(task);
    }
}
exports.SeqDBContext = SeqDBContext;
class SeqDBTask {
    constructor(context, querySql, params, execFunc) {
        this.context = context;
        this.querySql = querySql;
        if (params)
            this.params = params;
        if (execFunc)
            this.execFunc = execFunc;
    }
    getContext() {
        return this.context;
    }
    exec() {
        return new Promise((resolveTask, rejectTask) => {
            if (this.execFunc) {
                this.execFunc(this.getContext().sequilize, this.getContext().getTransaction(), this).then((res) => {
                    this.rs = res;
                    resolveTask(this);
                }).catch((err) => {
                    rejectTask(err);
                });
            }
            else {
                let params = [];
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
    setParams(params) {
        this.params = params;
    }
    getResult() {
        return this.rs;
    }
}
exports.SeqDBTask = SeqDBTask;
