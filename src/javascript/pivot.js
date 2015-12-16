Ext.define('Rally.technicalservices.data.PivotStoreFactory',{

    mixins: {
        observable: 'Ext.util.Observable'
    },

    logger: new Rally.technicalservices.Logger(),

    xAxis: {
        field: undefined,
        attributeField: undefined,
        values: undefined
    },

    yAxis: {
        field: undefined,
        attributeField: undefined,
        values: undefined
    },

    noneText: "-- No Entry --",
    totalField: 'total',
    totalText: 'Total',
    includeXTotal: true,
    includeYTotal: true,
    includeNone: true,

    constructor: function (config) {
        Ext.apply(this,config);
        this.logger.log('Pivot constructor', this, config);
        // The Observable constructor copies all of the properties of `config` on
        // to `this` using Ext.apply. Further, the `listeners` property is
        // processed to add listeners.
        //
        this.mixins.observable.constructor.call(this, config);
    },
    getFetchFields: function(){
        var xAxisField = this.xAxis && this.xAxis.field || null,
            yAxisField = this.yAxis && this.yAxis.field || null,
            attributeFields = [];

        if (this.xAxis && this.xAxis.attributeField) {attributeFields.push(this.xAxis.attributeField);}
        if (this.yAxis && this.yAxis.attributeField) {attributeFields.push(this.yAxis.attributeField);}

        return [xAxisField, yAxisField].concat(attributeFields);

    },
    getFilters: function(){
        return this.gridFilter && this.gridFilter.length > 0 ? Rally.data.wsapi.Filter.fromQueryString(this.gridFilter) : [];
    },
    getSorters: function(direction){

        var sorterProperty = this.xAxis && this.xAxis.field;
        if (sorterProperty && this.xAxis.attributeField){
            sorterProperty = sorterProperty + '.' + this.xAxis.attributeField;
        }

        return [{
            property: sorterProperty,
            direction: direction || "ASC"
        }];
    },
    fetchXAxisFields: function(){
        var deferred = Ext.create('Deft.Deferred'),
            modelName = this.modelName,
            xAxisField = this.xAxis.field,
            noneText = this.noneText,
            includeNone = this.includeNone,
            includeTotal = this.includeXTotal,
            totalField = this.totalText,
            xAxisValues = this.xAxis.values || [];

        Rally.data.ModelFactory.getModel({
            type: modelName,
            success: function(model) {
                model.getField(xAxisField).getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        var allowedValues = [];

                        _.each(records, function(allowedValue) {
                            var val = allowedValue.get('StringValue');
                            if (val && (Ext.Array.contains(xAxisValues, val) || xAxisValues.length ===0)) {
                                allowedValues.push(val);
                            }
                        }, this);

                        //include/disclude none
                        if (includeNone){
                            allowedValues.push(noneText)
                        }
                        //include/disclude total
                        if (includeTotal){
                            allowedValues.push(totalField)
                        }

                        deferred.resolve(allowedValues);
                    }
                });
            },
            scope: this
        });
        return deferred;
    },
    fetchRecords: function(){
        var deferred = Ext.create('Deft.Deferred');

        return Ext.create('Rally.data.wsapi.Store', {
            model: this.modelName,
            fetch: this.getFetchFields(),
            filters: this.getFilters(),
            limit: 'Infinity',
            sorters: this.getSorters()

        }).load({
            callback: function(records, operation, success){
                this.logger.log('fetchRecords load', records, operation, success);
                deferred.resolve(records);
            },
            scope: this
        });

        return deferred;
    },
    loadPivotedDataStore: function(){

        Deft.Promise.all([this.fetchRecords(),this.fetchXAxisFields()]).then({
            success: function(results){
                this.logger.log('loadPivotedDataStore success', results);
                var records = results[0],
                    xAxisFields = results[1],
                    yAxisFields = [this.yAxis.field],
                    store = this.getPivotedDataStore(records, xAxisFields);

                this.fireEvent('load', store, yAxisFields.concat(xAxisFields));
            },
            failure: function(msg){
                this.fireEvent('error', msg);
            },
            scope: this
        });

    },
    _initializeDataHash: function(yValues, xAxisFields, includeXTotal,includeYTotal){
        var hash = {},
            yAxisField = this.yAxis.field;

        _.each(yValues, function(y){
            hash[y] = this._initializeRow(yAxisField, y, xAxisFields, includeXTotal)
        },this);


        this.logger.log('_inititalizeDataHash', hash);
        return hash;
    },
    getPivotedDataStore: function(records, xAxisFields){

        this.logger.log('getPivotedDataStore',xAxisFields);

        var xAxis = this.xAxis,
            yAxis = this.yAxis,
            xAxisField = xAxis && xAxis.field,
            yAxisField = yAxis && yAxis.field,
            xAxisAttributeField = xAxis && xAxis.attributeField,
            yAxisAttributeField = yAxis && yAxis.attributeField,
            fields = [yAxisField].concat(xAxisFields),
            includeYTotal= this.includeYTotal,
            includeXTotal= this.includeXTotal,
            xValues =  xAxisFields,  //we take care of filtering out xAxisValues in the getXAxisFields function
            yValues = this.yAxis.values || [],
            totalRow =  this._initializeRow(yAxisField, this.totalText, xAxisFields, includeXTotal),
            dataHash = this._initializeDataHash(yValues, xValues,includeXTotal,includeYTotal);

            _.each(records, function(r){
            var xVal = xAxisAttributeField ? r.get(xAxisField)[xAxisAttributeField] : r.get(xAxisField),
                yVal = yAxisAttributeField ? r.get(yAxisField)[yAxisAttributeField] : r.get(yAxisField);

            if (!xVal || xVal.length === 0){
                xVal = this.noneText;
            }

            if (Ext.Array.contains(yValues, yVal) || yValues.length === 0){
                if (!dataHash[yVal]){
                    dataHash[yVal] = this._initializeRow(yAxisField, yVal, xAxisFields, includeXTotal);
                }
                if (Ext.Array.contains(xValues, xVal) || xValues.length === 0){
                    dataHash[yVal][xVal] = dataHash[yVal][xVal] + 1;
                    if (includeXTotal) {
                        dataHash[yVal].total = dataHash[yVal].total + 1;
                    }
                    if (includeYTotal){
                        totalRow[xVal] =  totalRow[xVal] + 1;
                    }
                }
            }
        }, this);

        if (includeYTotal) {
            dataHash[this.totalText] = totalRow;
        }

        return Ext.create('Rally.data.custom.Store',{
            fields: fields,
            data: _.values(dataHash)
        });
    },
    _initializeRow: function(yAxisField, yVal, xAxisFields, includeXTotal){
        var row = {};
        row[yAxisField] = yVal;

        if (includeXTotal){
            row.total = 0;
        }

        _.each(xAxisFields, function(f){
            row[f]=0;
        });
        return row;
    }
});
