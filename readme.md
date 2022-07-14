# @multiple-transaction-manager/sequelize

> Sequelize context implementation for multiple-transaction-manager library. 

Please refer to the test cases for a sample use case

## API

### Classes

#### __SeqDBContext__

####  `constructor(txnMngr, sequilize)`
-   `txnMngr`: _{MultiTxnMngr}_ The multiple transaction manager to to bind with the context.
-   `sequilize`: _{Sequelize}_ The Sequelize instance.
-   Returns: {SeqDBContext} The created _SeqDBContext_ instance.

#### `addFunctionTask(execFunc)`

Adds a task to the transaction manager.

-   `execFunc`: _{(sequilize: Sequelize, txn: Transaction, task: Task) => Promise<unknown | undefined>) | undefined}_ The function to be executes in promise. Sequelize and current transaction instances are provided to the function.
-   Returns: {SeqDBTask} Returns the created _SeqDBTask_ instance.

#### `addTask(querySql: string, params?: unknown | undefined)`

A shortcut to add a SQL task to the transaction manager.

-   `querySql`: _{string}_ The query string to be executes in promise.
-   `params`: _{unknown | undefined}_ Optional parameter object to bind SQL statement variables.
-   Returns: {SeqDBTask} The created _SeqDBTask_ instance.


#### __SeqDBTask__

####  `constructor(context, querySql, params, execFunc)`
-   `context`: _{SeqDBContext}_ The _SeqDBContext_ to to bind with the task.
-   `querySql`: _{string}_ The query string to be executes in promise. __Ignored if execFunc parameter is provided__.
-   `params`: _{unknown | undefined}_ Optional parameter object to bind SQL statement variables. __Ignored if execFunc parameter is provided__.
-   `execFunc`: _{(sequilize: Sequelize, txn: Transaction, task: Task) => Promise<unknown | undefined>) | undefined}_  Sequelize and current transaction instances are provided to the function.
-   Returns: {SeqDBTask} The created _SeqDBTask_ instance.

## Example

https://github.com/kaplanke/mtxn-sequelize/blob/master/test/mtxn.seq.test.ts

```js
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

    // Add control step
    const controlTask: Task = seqContext.addTask("SELECT * FROM Students");

    await txnMngr.exec();

    expect(controlTask.getResult().results[1]["name"]).toEqual("Kevin");
```
