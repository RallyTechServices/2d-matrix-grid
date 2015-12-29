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
                var collectionField = this.getCollectionField();
                if (false){ //We don't need this for tags, because we have the _tagsNameArray attribute but might if we add other collection fields
                //if (collectionField && collectionField.length > 0){
                    return this.fetchCollectionValues(records, collectionField);
                } else {
                    deferred.resolve(records);
                }
            },
            scope: this
        });

        return deferred;
    },
    fetchCollectionValues: function(records, collectionField){
        var deferred = Ext.create('Deft.Deferred'),
            me = this,
            promises = [];

        _.each(records, function(r){
            if (r.get(collectionField) && r.get(collectionField).Count > 0){
                promises.push(this.fetchCollection(r, collectionField));
            } else {
                r.set(collectionField + 'Array', []);
            }
        }, this);

        if (promises.length > 0){
            Deft.Promise.all(promises).then({
                success: function(){
                    me.logger.log('fetchCollectionValues', records);
                    deferred.resolve(records);
                }
            });
        } else {
            deferred.resolve(records);
        }

        return deferred;
    },
    fetchCollection: function(record, fieldName){
        var deferred = Ext.create('Deft.Deferred');

        record.getCollection(fieldName).load({
            callback: function(records, operation, success){
                var collectionNames = [];
                _.each(records, function(r){
                    collectionNames.push(r.get('Name'));
                });
                record.set(fieldName + 'Array', collectionNames);
                console.log('record.set', fieldName, collectionNames, record);
                deferred.resolve();
            }
        });

        return deferred;
    },
    getCollectionField: function(){
        if (this.yAxis.field === 'Tags'){
            return "Tags";
        }
        return null;
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
            totalText = this.totalText,
            totalRow =  this._initializeRow(yAxisField, totalText, xAxisFields, includeXTotal),
            dataHash = this._initializeDataHash(yValues, xValues,includeXTotal,includeYTotal);

            _.each(records, function(r){
                var xVal = xAxisAttributeField && r.get(xAxisField) ? r.get(xAxisField)[xAxisAttributeField] : r.get(xAxisField) || this.noneText,
                    yVal = yAxisAttributeField && r.get(yAxisField)? r.get(yAxisField)[yAxisAttributeField] : r.get(yAxisField) || this.noneText;

                if (!xVal || xVal.length === 0){
                    xVal = this.noneText;
                }

                var includedYVals = [];
                if (yAxisAttributeField === '_tagsNameArray'){ //_tagsNameArray
                    includedYVals = _.map(yVal, function(y){
                        return y.Name;
                    });
                    if (yValues.length > 0){
                        includedYVals = Ext.Array.intersect(includedYVals, yValues);
                    }
                } else {
                    if (Ext.Array.contains(yValues, yVal) || yValues.length === 0) {
                        includedYVals.push(yVal)
                    }
                }

                _.each(includedYVals, function(y){
                    if (!dataHash[y]){
                        dataHash[y] = this._initializeRow(yAxisField, y, xAxisFields, includeXTotal);
                    }
                    if (Ext.Array.contains(xValues, xVal) || xValues.length === 0){
                        dataHash[y][xVal] = dataHash[y][xVal] + 1;
                        if (includeXTotal) {
                            dataHash[y][totalText] = dataHash[y][totalText] + 1;
                        }
                        if (includeYTotal){
                            totalRow[xVal] =  totalRow[xVal] + 1;
                            totalRow[totalText] = totalRow[totalText] + 1;
                        }
                    }
                }, this);

            }, this);

        if (includeYTotal) {
            dataHash[this.totalText] = totalRow;
        }

        var sortField = yAxisField;
        if (this.sortBy === 'total'){
            sortField = this.totalText;
        }

        var data = this._getSortedData(dataHash, sortField, this.sortDir, this.rowLimit, this.totalText, yAxisField);
        return Ext.create('Rally.data.custom.Store',{
            fields: fields,
            data: data,
            remoteSort: false
        });
    },
    _getSortedData: function(dataHash, sortField, sortDir, rowLimit, totalText, nameField){
        var data = _.values(dataHash),
            sortMultiplier = sortDir.toLowerCase() === 'asc' ? -1 : 1,
            sortedData = Ext.Array.sort(data, function(a,b){
                if (b[nameField] === totalText){
                    return -1;
                }
                if (a[sortField] < b[sortField])
                    return sortMultiplier;
                if (a[sortField] > b[sortField])
                    return -1 * sortMultiplier;
                return 0;
            });

        if (rowLimit && rowLimit > 0){
            var truncatedData = Ext.Array.slice(sortedData,0,rowLimit);
            if (rowLimit < sortedData.length && dataHash[totalText]){
                //now we need to recalculate the total row and add it back in...
                var totalRow = {};
                totalRow[nameField] = totalText;
                _.each(truncatedData, function(rec){
                    _.each(rec, function(val, key){
                        if (key !== nameField){
                            totalRow[key] = (totalRow[key] || 0) + val;
                        }
                    });
                });
                truncatedData.push(totalRow);
            }
            return truncatedData;
        }
        return sortedData;
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
