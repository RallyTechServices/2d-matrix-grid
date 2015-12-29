Ext.define('Rally.technicalservices.TwoDGridSettings',{
    singleton: true,

    getFields: function(modelName, config){

        var sortBy = config.sortBy || 'alpha',
            sortDir = config.sortDir || 'desc';

        var width = 150;
        var settings = [{
            xtype: 'rallyfieldcombobox',
            model: modelName,
            name: 'xAxisField',
            fieldLabel: 'X Axis Field',
            labelWidth: width,
            labelAlign: 'right',
            blackListFields: [],
            whiteListFields: ['Release','Iteration','ScheduleState','State'],
            allowedTypes: ['STRING','RATING'],
            constrained: true,
            bubbleEvents: ['change']
        },{
            name: 'xAxisValues',
            xtype: 'multivaluecombo',
            readyEvent: 'ready',
            labelWidth: width,
            labelAlign: 'right',
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
            labelAlign: 'right',
            fieldLabel: 'Y Axis Field',
            labelWidth: width,
            blackListFields: [],
            whiteListFields: ['Release','Iteration','Project','ScheduleState','State','Owner','SubmittedBy','Tags'],
            allowedTypes: ['STRING','RATING'],
            constrained: true,
            bubbleEvents: ['change']
        },{
            name: 'yAxisValues',
            xtype: 'multivaluecombo',
            //margin: '0 0 25 10',
            readyEvent: 'ready',
            labelWidth: width,
            labelAlign: 'right',
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
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Include Blanks',
            value: true,
            name: 'includeBlanks',
            labelAlign: 'right',
            labelWidth: width
        },{
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Include Row Totals',
            value: true,
            name: 'includeXTotal',
            labelAlign: 'right',
            labelWidth: width
        },{
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Include Column Totals',
            value: true,
            name: 'includeYTotal',
            labelAlign: 'right',
            labelWidth: width
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Sort By',
            columns: 1,
            vertical: true,
            labelWidth: width,
            labelAlign: 'right',
            items: [{
                boxLabel: "Alphabetical",
                name: 'sortBy',
                inputValue: 'alpha',
                checked: sortBy === 'alpha'
            },{
                boxLabel: "Total",
                name: 'sortBy',
                inputValue: 'total',
                checked: sortBy === 'total'
            }]
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Sort Direction',
            columns: 1,
            vertical: true,
            labelWidth: width,
            labelAlign: 'right',
            items: [{
                boxLabel: "Descending",
                name: 'sortDir',
                inputValue: 'desc',
                checked: sortDir === 'desc'
            },{
                boxLabel: "Ascending",
                name: 'sortDir',
                inputValue: 'asc',
                checked: sortDir === 'asc'
            }]
        },{
            xtype: 'rallynumberfield',
            fieldLabel: 'Total Rows to Display (Blank for no limit)',
            name: 'rowLimit',
            labelWidth: width,
            labelAlign: 'right',
            minValue: 1,
            allowBlank: true
        },{
            xtype: 'textarea',
            fieldLabel: 'Query',
            name: 'gridFilter',
            anchor: '100%',
            cls: 'query-field',
            margin: '0 70 0 0',
            labelAlign: 'right',
            labelWidth: width,
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
