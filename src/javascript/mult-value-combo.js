/*
 * create a form field thing.
 */

Ext.define('Rally.technicalservices.MultiValueComboBox',{
    alias: 'widget.multivaluecombo',
    extend: 'Ext.form.FieldContainer',

    mixins: {
        field: 'Ext.form.field.Field'
    },

    cls: 'multistate',

    config: {
        /**
         * @cfg {String}
         * The label for the field to be passed through to the combobox
         */
        fieldLabel: '',
        modelName: undefined,
        fieldName: undefined,
        value: undefined
    },
    refreshField: function(fieldName){
        this.fieldName = fieldName;
        this._initCombobox();
    },
    initComponent: function() {
        this.callParent(arguments);

        this.mixins.field.initField.call(this);
        this._initCombobox();

    },
    _initCombobox: function(){
        var me = this;
        if (this.down('rallycombobox')){
            this.down('rallycombobox').destroy();
        }

        this.add([{
            xtype: 'rallycombobox',
            name: 'valField',
            plugins: ['rallyfieldvalidationui'],
            multiSelect: true,
            emptyText: this.emptyText,
            displayField: 'name',
            valueField: 'value',
            width: this.width,
            editable: false,
            submitValue: false,
            storeType: 'Ext.data.Store',
            storeConfig: {
                remoteFilter: false,
                fields: ['name', 'value'],
                data: []
            },
            listeners: {
                'change': function(cb,new_value, old_value){
                    me.currentValue = new_value;
                }
            }
        }]);

        if (this.modelName && this.fieldName){
            this._loadValues();
        }

    },
    _loadValues: function() {
        Rally.technicalservices.WsapiToolbox.fetchAllowedValues(this.modelName,this.fieldName).then({
            scope: this,
            success: function(value_names) {

                var values = Ext.Array.map(value_names,function(value_name){
                    return { 'name': value_name, 'value': value_name }
                });

                var combobox = this.down('rallycombobox');
                combobox.getStore().loadData(values);

                var current_values = this.getValue();
                console.log('current values:', current_values);

                if ( current_values && !Ext.isArray(current_values) ) {
                    current_values = current_values.split(',');
                }
                combobox.setValue(current_values);
                this.fireEvent('ready',this);

            },
            failure: function(msg) {
                Ext.Msg.alert('Problem Retrieving States', msg);
            }
        });
    },

    getSubmitData: function() {
        var data = {};
        data[this.name] = this.currentValue;
        return data;
    }
});