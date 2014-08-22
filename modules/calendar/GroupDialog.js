GO.calendar.GroupDialog = function(config) {

	if (!config) {
		config = {};
	}
    
	this.buildForm();
	var focusFirstField = function() {
		this.propertiesPanel.items.items[0].focus();
	};
    
	config.collapsible = true;
	config.maximizable = true;
	config.layout = 'fit';
	config.modal = false;
	config.resizable = false;
	config.width = 550;
	config.height = 450;
	config.closeAction = 'hide';
	config.title = GO.calendar.lang.resource_group;
	config.items = this.formPanel;
	config.focus = focusFirstField.createDelegate(this);
	config.buttons = [{
		text : GO.lang['cmdOk'],
		handler : function() {
			this.submitForm(true);
		},
		scope : this
	}, {
		text : GO.lang['cmdApply'],
		handler : function() {
			this.submitForm();
		},
		scope : this
	}, {
		text : GO.lang['cmdClose'],
		handler : function() {
			this.hide();
		},
		scope : this
	}];

	GO.calendar.GroupDialog.superclass.constructor.call(this, config);
	this.addEvents({
		'save' : true
	});
    
};

Ext.extend(GO.calendar.GroupDialog, GO.Window, {
	show : function(group_id, config)
	{
		if (!this.rendered)
		{
			this.render(Ext.getBody());
		}
		this.formPanel.form.reset();
		this.tabPanel.setActiveTab(0);
		if (!group_id)
		{
			group_id = 0;
		}
		this.setGroupId(group_id);
        
		if (this.group_id > 0)
		{
			this.formPanel.load({
				url : GO.url("calendar/group/load"),
				waitMsg : GO.lang['waitMsgLoad'],
				success : function(form, action)
				{
					this.groupAdminsPanel.setModelId(action.result.data.id);
					
					if(this.group_id == 1)
					{
						this.tabPanel.hideTabStripItem('permissions-panel');
						this.tabPanel.hideTabStripItem(this.groupAdminsPanel);
						this.setTitle(GO.calendar.lang.calendar_group);
					}else
					{
						this.tabPanel.unhideTabStripItem('permissions-panel');
						this.tabPanel.unhideTabStripItem(this.groupAdminsPanel);
						
						
						this.setTitle(GO.calendar.lang.resource_group);
					}

					GO.calendar.GroupDialog.superclass.show.call(this);
				},
				failure : function(form, action)
				{
					GO.errorDialog.show(action.result.feedback)
				},
				scope : this
			});            
		} else
{			
			this.groupAdminsPanel.setModelId(0);
			GO.calendar.GroupDialog.superclass.show.call(this);
		}
	},
	setGroupId : function(group_id)
	{
		if(GO.customfields)
			this.disableCategoriesPanel.setModel(group_id,"GO_Calendar_Model_Event");
		
		this.formPanel.form.baseParams['id'] = group_id;
		this.group_id = group_id;
	},
	submitForm : function(hide)
	{
		this.formPanel.form.submit({
			url : GO.url("calendar/group/submit"),			
			waitMsg : GO.lang['waitMsgSave'],
			success : function(form, action)
			{
				if (action.result.id)
				{
					this.groupAdminsPanel.setModelId(action.result.id);
					this.setGroupId(action.result.id);
				}
		
				var fields = (this.group_id == 1) ? action.result.fields : false;
				
				this.fireEvent('save', this, this.group_id, fields);
				
				if (hide)
				{
					this.hide();
				}
			},
			failure : function(form, action)
			{
				if (action.failureType == 'client')
				{
					Ext.MessageBox.alert(GO.lang['strError'],
						GO.lang['strErrorsInForm']);
				} else
{
					Ext.MessageBox.alert(GO.lang['strError'],
						action.result.feedback);
				}
			},
			scope : this
		});
	},
	buildForm : function()
	{
		this.propertiesPanel = new Ext.Panel({
			title : GO.lang['strProperties'],
			cls : 'go-form-panel',
			layout : 'form',
			autoScroll : true,
			items : [{
				xtype : 'textfield',
				name : 'name',
				anchor : '100%',
				fieldLabel : GO.lang.strName
			},{
				xtype:'xcheckbox',
				name:'show_not_as_busy',
				hideLabel: true,
				boxLabel:GO.calendar.lang.showNotBusy
			}]
		});

		//		if(GO.customfields && GO.customfields.types["1"])
		//		{
		//			if(GO.customfields.types["1"].panels.length > 0)
		//			{
		//				var cfFieldset = new Ext.form.FieldSet({
		//					autoHeight:true,
		//					title:GO.customfields.lang.customfields
		//				});
		//				for(var i=0;i<GO.customfields.types["1"].panels.length;i++)
		//				{
		//					cfFieldset.add({
		//						xtype:'checkbox',
		//						name:'fields[cf_category_'+GO.customfields.types["1"].panels[i].category_id+']',
		//						hideLabel: true,
		//						boxLabel:GO.customfields.types["1"].panels[i].title
		//					});
		//				}
		//				this.propertiesPanel.add(cfFieldset);
		//			}
		//		}
		//	
		var items = [this.propertiesPanel];

		this.groupAdminsPanel = new GO.base.model.multiselect.panel({
			title: GO.calendar.lang.admins,
			url:'calendar/groupAdmin',
			columns:[
				{header: GO.lang.strTitle, dataIndex: 'name'},
				{header:GO.lang.strEmail,dataIndex: 'email'}
			],
			fields:['id','name','email'],
			model_id:0
		});

		items.push(this.groupAdminsPanel);
		
		if(GO.customfields){
			this.disableCategoriesPanel = new GO.customfields.DisableCategoriesPanel();
			items.push(this.disableCategoriesPanel);
		}
        
		this.tabPanel = new Ext.TabPanel({
			activeTab : 0,
			deferredRender : false,
			border : false,
			items : items,
			anchor : '100% 100%'
		});
        
		this.formPanel = new Ext.form.FormPanel({
			waitMsgTarget : true,			
			border : false,
			baseParams : {
				id:0
			},
			items : this.tabPanel
		});        
	}
    
});
