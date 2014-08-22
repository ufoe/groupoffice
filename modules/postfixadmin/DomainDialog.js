/** 
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @version $Id: DomainDialog.js 15485 2013-08-19 14:37:28Z mschering $
 * @copyright Copyright Intermesh
 * @author Merijn Schering <mschering@intermesh.nl>
 */
 
//GO.postfixadmin.DomainDialog = function(config){
//	
//	
//	if(!config)
//	{
//		config={};
//	}
//	
//	
//	this.buildForm();
//	
//	var focusFirstField = function(){
//		if(this.propertiesPanel)
//			this.formPanel.form.findField('domain').focus();
//	};
//	
//	
//	config.maximizable=true;
//	config.layout='fit';
//	config.modal=false;
//	config.resizable=false;
//	config.closeAction='hide';
//	config.items= this.formPanel;
//	config.focus= focusFirstField.createDelegate(this);
//	config.buttons=[					
//	];
//
//	if(GO.settings.modules.postfixadmin.write_permission)
//	{
//		config.buttons.push({
//			text: GO.lang['cmdOk'],
//			handler: function(){
//				this.submitForm(true);
//			},
//			scope: this
//		},{
//			text: GO.lang['cmdApply'],
//			handler: function(){
//				this.submitForm();
//			},
//			scope:this
//		});
//	}
//
//	config.buttons.push({
//			text: GO.lang['cmdClose'],
//			handler: function(){
//				this.hide();
//			},
//			scope:this
//		})
//
//	GO.postfixadmin.DomainDialog.superclass.constructor.call(this, config);
//	this.addEvents({'save' : true});
//}

GO.postfixadmin.DomainDialog = Ext.extend(GO.dialog.TabbedFormDialog,{
	
	enableOkButton : GO.settings.modules.postfixadmin.write_permission,
	
	enableApplyButton : GO.settings.modules.postfixadmin.write_permission,
	
	initComponent : function(){
		Ext.apply(this, {
			titleField:'domain',
			title: GO.postfixadmin.lang.domain,
			formControllerUrl: 'postfixadmin/domain',
			width:700,
			height:600
			//fileUpload:true
		});
		GO.postfixadmin.DomainDialog.superclass.initComponent.call(this);	
	},
	
	beforeLoad : function(remoteModelId, config){
		if(GO.settings.modules.postfixadmin.write_permission)
			this.formPanel.form.findField('domain').setDisabled(remoteModelId>0);
	},
	
	afterLoad : function(remoteModelId, config, action){
//			GO.postfixadmin.defaultQuota = action.result.data.quota;
//			GO.postfixadmin.domain=action.result.data.domain;
		this.setBackupMX(action.result.data.backupmx=='1');
		
		if(!GO.settings.modules.postfixadmin.write_permission)
			this.mailboxesGrid.store.load();
	},

	afterSubmit : function(action){
		this.fireEvent('save', this);
//		GO.postfixadmin.defaultQuota = this.formPanel.form.findField("default_quota").getValue();
//		GO.postfixadmin.domain = this.formPanel.form.findField("domain").getValue();
	},
	
//	submitForm : function(hide){
//		this.formPanel.form.submit(
//		{
//			url:GO.url('postfixadmin/domain/save'),
//			waitMsg:GO.lang['waitMsgSave'],
//			success:function(form, action){
//				
//				this.fireEvent('save', this);
//				
//				if(hide)
//				{
//					this.hide();	
//				}else
//				{				
//					if(action.result.domain_id)
//					{
//						this.setDomainId(action.result.domain_id);						
//						
//						this.mailboxesGrid.setDisabled(this.formPanel.form.findField("backupmx").getValue());
//						this.aliasesGrid.setDisabled(this.formPanel.form.findField("backupmx").getValue());
//						
//						this.readPermissionsTab.setAcl(action.result.acl_id);
//					}
//				}

//				GO.postfixadmin.defaultQuota = this.formPanel.form.findField("quota").getValue();
				
//				var d = this.formPanel.form.findField("domain");
//				
//				this.updateTitle(d.getValue());
//				GO.postfixadmin.domain=d.getValue();
//				
//			},		
//			failure: function(form, action) {
//				if(action.failureType == 'client')
//				{					
//					Ext.MessageBox.alert(GO.lang['strError'], GO.lang['strErrorsInForm']);			
//				} else {
//					Ext.MessageBox.alert(GO.lang['strError'], action.result.feedback);
//				}
//			},
//			scope: this
//		});
//		
//	},
	
//	show : function (domain_id, config) {
//		if(!this.rendered)
//		{
//			this.render(Ext.getBody());
//		}
//		
//		if(!domain_id)
//		{
//			domain_id=0;			
//		}
//		
//		if(this.domain_id>0)
//		{
//			this.formPanel.load({
//				url : GO.url('postfixadmin/domain/load'),
//				
//				success:function(form, action)
//				{				
//					this.updateTitle(action.result.data.domain);
//					
//					GO.postfixadmin.DomainDialog.superclass.show.call(this);
//				},
//				failure:function(form, action)
//				{
//					GO.errorDialog.show(action.result.feedback)
//				},
//				scope: this
//				
//			});
//		}else 
//		{			
//			this.formPanel.form.reset();
//
//			this.updateTitle();
//
//			GO.postfixadmin.DomainDialog.superclass.show.call(this);
//		}
//	},

//	updateTitle : function(title){
//		if(GO.util.empty(title))
//			title=GO.postfixadmin.lang.domain;
//
//		this.setTitle(title);
//	},
		
//	setDomainId : function(domain_id)
//	{
//		this.formPanel.form.baseParams['id']=domain_id;
//		this.domain_id=domain_id;
//
//		if(GO.settings.modules.postfixadmin.write_permission)
//			this.formPanel.form.findField('domain').setDisabled(domain_id>0);
//		
//		this.mailboxesGrid.setDomainId(domain_id);
//		this.aliasesGrid.setDomainId(domain_id);
//	},
	
	setBackupMX : function(backupmx)
	{
		this.mailboxesGrid.setDisabled(backupmx || !this.remoteModelId);
		this.aliasesGrid.setDisabled(backupmx || !this.remoteModelId);

		if(GO.settings.modules.postfixadmin.write_permission){
			var f = this.formPanel.form;

			f.findField('max_aliases').setDisabled(backupmx);
			f.findField('max_mailboxes').setDisabled(backupmx);
			f.findField('total_quota').setDisabled(backupmx);
			f.findField('default_quota').setDisabled(backupmx);
		}
	},	
	
	buildForm : function () {

		this.mailboxesGrid = new GO.postfixadmin.MailboxesGrid();   

		if(GO.settings.modules.postfixadmin.write_permission){
			this.propertiesPanel = new Ext.Panel({
				title:GO.lang['strProperties'],
				cls:'go-form-panel',waitMsgTarget:true,
				layout:'form',
				autoScroll:true,
				items:[this.selectUser = new GO.form.SelectUser({
					fieldLabel: GO.lang['strUser'],
					disabled: !GO.settings.modules['postfixadmin']['write_permission'],
					value: GO.settings.user_id,
					anchor: '-20'
				}),{
					xtype: 'textfield',
					name: 'domain',
					anchor: '-20',
					allowBlank:false,
					fieldLabel: GO.postfixadmin.lang.domain
				},{
					xtype: 'textfield',
					name: 'description',
					anchor: '-20',
					fieldLabel: GO.lang.strDescription
				},new GO.form.NumberField({
					decimals:"0",
					disabled:!GO.settings.modules.postfixadmin.write_permission,
					name: 'max_aliases',
					anchor: '-20',
					allowBlank:false,
					fieldLabel: GO.postfixadmin.lang.maxAliases,
					value:'0'
				}),new GO.form.NumberField({
					decimals:"0",
					disabled:!GO.settings.modules.postfixadmin.write_permission,
					name: 'max_mailboxes',
					anchor: '-20',
					allowBlank:false,
					fieldLabel: GO.postfixadmin.lang.maxMailboxes,
					value:'0'
				}),this.maxQuotaField = new GO.form.NumberField({
					decimals:"0",
					disabled:!GO.settings.modules.postfixadmin.write_permission,
					name: 'total_quota',
					anchor: '-20',
					allowBlank:false,
					fieldLabel: GO.postfixadmin.lang.maxquota,
					value:'0'
				}),this.quotaField = new GO.form.NumberField({
					decimals:"0",
					name: 'default_quota',
					anchor: '-20',
					allowBlank:false,
					fieldLabel: GO.postfixadmin.lang.defaultQuota,
					value:'0'
				}),{
					xtype: 'xcheckbox',
					name: 'active',
					anchor: '-20',
					allowBlank:false,
					boxLabel: GO.postfixadmin.lang.active,
					hideLabel: true,
					checked: true
				},{
					xtype: 'xcheckbox',
					name: 'backupmx',
					anchor: '-20',
					allowBlank:false,
					boxLabel: GO.postfixadmin.lang.backupmx,
					hideLabel: true,
					listeners:{
						check:function(cb, check){
							this.setBackupMX(check);

						},
						scope:this
					}
				}]

			});
			
			this.addPanel(this.propertiesPanel);
		}
    
    
		this.addPanel(this.mailboxesGrid, 'domain_id');
    
		this.aliasesGrid = new GO.postfixadmin.AliasesGrid();   
		this.addPanel(this.aliasesGrid,'domain_id');		

		this.addPermissionsPanel(new GO.grid.PermissionsPanel({
			hideLevel:true,
			addLevel: GO.permissionLevels.writeAndDelete
		})); 
	}
});