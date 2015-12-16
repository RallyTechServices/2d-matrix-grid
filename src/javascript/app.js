Ext.define("2d-matrix-grid", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],
    config: {
        defaultSettings: {
            modelName: 'defect',
            xAxisField: 'Severity',
            yAxisField: 'Project',
            xAxisValues: undefined,
            yAxisValues: undefined,
            gridFilter: ''
        }
    },

    fieldTypeAttribute: {
        Project: 'Name',
        Release: 'Name',
        Iteration: 'Name',
        Owner: 'Name'
    },
    modelObj: undefined,

    launch: function() {
        this._loadModel(this.getSettings());
    },
    _loadModel: function(settings){

        Rally.data.ModelFactory.getModel({
            type: settings.modelName,
            success: function(model) {
                this.modelObj = model,
                this._createPivotedStore(settings);
            },
            scope: this
        });

    },
    _createPivotedStore: function(settings){

        var psf = Ext.create('Rally.technicalservices.data.PivotStoreFactory',{
           modelName: settings.modelName,
           xAxis: {
               field: this.getXAxisField(),
               attributeField: this.getXAxisAttributeField(),
               values: this.getXAxisValues()
           },
           yAxis: {
               field: this.getYAxisField(),
               attributeField: this.getYAxisAttributeField(),
               values: this.getYAxisValues()
           },
           gridFilter: this.getSetting('gridFilter')
        });
        psf.on('load', this._addGrid, this);
        psf.on('error', this._showError, this);
        psf.loadPivotedDataStore();
    },
    _showError: function(errorMsg){
        this.logger.log('_showError', errorMsg);
    },
    getXAxisField: function(){
        return this.getSetting('xAxisField');
    },
    getYAxisField: function(){
        return this.getSetting('yAxisField');
    },
    getXAxisValues: function(){
        return this.getArraySettings('xAxisValues');
    },
    getYAxisValues: function(){
        return this.getArraySettings('yAxisValues');
    },
    getArraySettings: function(settingsKey){
        var vals = this.getSetting(settingsKey);
        if (!vals){
            return [];
        }
        if (Ext.isString(vals)){
            return vals.split(',');
        }
        return vals;
    },
    getXAxisAttributeField: function(){
        return this.fieldTypeAttribute[this.getXAxisField()] || null;
    },
    getYAxisAttributeField: function(){
        return this.fieldTypeAttribute[this.getYAxisField()] || null;
    },
    _addGrid: function(store, fields){
        this.logger.log('_addGrid', store, fields);

        if (this.down('rallygrid')){
            this.down('rallygrid').destroy();
        }

        this.add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: this._getColumns(fields),
            showPagingToolbar: false
        });

    },
    _getColumns: function(fields){
        var cols = [];
        _.each(fields, function(key) {
            cols.push({text: key, dataIndex: key});
        });

        this.logger.log('_getColumns', cols);
        return cols;
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    getSettingsFields: function(){
        return Rally.technicalservices.TwoDGridSettings.getFields(this.getSetting('modelName'));
    },
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this._loadModel(settings);
    }
});
