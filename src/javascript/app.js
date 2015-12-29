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
            includeXTotal: true,
            includeYTotal: true,
            gridFilter: '',
            includeBlanks: true,
            sortBy: 'total',
            sortDir: 'desc',
            rowLimit: ''
        }
    },

    fieldTypeAttribute: {
        Project: 'Name',
        Release: 'Name',
        Iteration: 'Name',
        Owner: 'Name',
        Tags: "_tagsNameArray"
    },

    totalText: 'Total',

    launch: function() {
        this._createPivotedStore(this.getSettings());
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
           includeNone: this.getSetting('includeBlanks'),
           includeXTotal: this.getSetting('includeXTotal'),
           includeYTotal: this.getSetting('includeYTotal'),
           gridFilter: this.getSetting('gridFilter'),
           totalText: this.totalText,
            sortBy: this.getSetting('sortBy'),
            sortDir: this.getSetting('sortDir'),
            rowLimit: this.getSetting('rowLimit')
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
        if (this.getXAxisField() === 'State'){
            var re = new RegExp("^PortfolioItem","i");
            if (re.test(this.getSetting('modelName'))){
                return "Name";
            }
        }
        return this.fieldTypeAttribute[this.getXAxisField()] || null;
    },
    getYAxisAttributeField: function(){
        if (this.getYAxisField() === 'State'){
            var re = new RegExp("^PortfolioItem","i");
            if (re.test(this.getSetting('modelName'))){
                return "Name";
            }
        }

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
        var cols = [],
            yAxisField = this.getYAxisField(),
            totalText = this.totalText;

        _.each(fields, function(key) {
            var align = 'right',
                flex = 2;

            if (key === yAxisField){
                align = 'left';
                flex = 3;
            }
            if (key === totalText){
                flex = 1;
            }

            cols.push({
                text: key,
                dataIndex: key,
                align: align,
                flex: flex,
                renderer: function(v,m,r){
                    if ((r.get(yAxisField) === totalText) || key === totalText){
                        m.tdCls = 'totalCls';
                    }
                    return v;
                }
            });
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
        return Rally.technicalservices.TwoDGridSettings.getFields(this.getSettings());
    },
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this._createPivotedStore(settings);
    }
});
