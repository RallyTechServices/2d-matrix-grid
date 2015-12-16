Ext.define('Rally.technicalservices.TwoDGridSettings',{
    singleton: true,

    getFields: function(modelName){
        var settings = [{
            xtype: 'rallyfieldcombobox',
            model: modelName,
            name: 'xAxisField',
            fieldLabel: 'X Axis Field',
            blackListFields: [],
            whiteListFields: ['Release','Iteration','ScheduleState','State'],
            allowedTypes: ['STRING','RATING'],
            constrained: true,
            bubbleEvents: ['change']
        },{
            name: 'xAxisValues',
            xtype: 'multivaluecombo',
            readyEvent: 'ready',
            width: 500,
            modelName: modelName,
            fieldName: null,
            emptyText: 'Choose field values to limit columns or leave blank to show all values...',
            fieldLabel: 'X Axis Values',
            handlesEvents: {
                change: function(cb) {
                    if (cb.name === 'xAxisField'){
                        this.refreshField(cb.getValue());
                    }
                }
            }
        },{
            xtype: 'rallyfieldcombobox',
            model: modelName,
            name: 'yAxisField',
            fieldLabel: 'Y Axis Field',
            blackListFields: [],
            whiteListFields: ['Release','Iteration','Project','ScheduleState','State','Owner','SubmittedBy'],
            allowedTypes: ['STRING','RATING'],
            constrained: true,
            bubbleEvents: ['change']
        },{
            name: 'yAxisValues',
            xtype: 'multivaluecombo',
            //margin: '0 0 25 10',
            readyEvent: 'ready',
            width: 500,
            modelName: modelName,
            fieldName: null,
            fieldLabel: 'Y Axis Values',
            emptyText: 'Choose field values to limit rows or leave blank to show all values...',
            handlesEvents: {
                change: function(cb) {
                    if (cb.name === 'yAxisField'){
                        this.refreshField(cb.getValue());
                    }
                }
            }
        },{
            xtype: 'textarea',
            fieldLabel: 'Query',
            name: 'gridFilter',
            anchor: '100%',
            cls: 'query-field',
            margin: '0 70 0 0',
            plugins: [
                {
                    ptype: 'rallyhelpfield',
                    helpId: 194
                },
                'rallyfieldvalidationui'
            ],
            validateOnBlur: false,
            validateOnChange: false,
            validator: function(value) {
                try {
                    if (value) {
                        Rally.data.wsapi.Filter.fromQueryString(value);
                    }
                    return true;
                } catch (e) {
                    return e.message;
                }
            }
        }];
        return settings;
    }
});
