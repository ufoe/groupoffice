/**
 * Copyright Intermesh
 *
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 * @version $Id: EmailClient.js 17663 2014-06-11 06:45:11Z mschering $
 * @copyright Copyright Intermesh
 * @author Merijn Schering <mschering@intermesh.nl>
 */


Ext.namespace("GO.email");

GO.email.EmailClient = function(config){

	if(!config)
	{
		config = {};
	}

	this.messagesStore = new GO.data.JsonStore({
		url: GO.url("email/message/store"),
		root: 'results',
		totalProperty: 'total',
		id: 'uid',
		fields:['uid','icon','deleted', 'flagged','has_attachments','seen','subject','from','sender','size','date', 'x_priority','answered','forwarded','account_id','mailbox','arrival','arrival_time','date_time'],
		remoteSort: true
	});

	this.messagesStore.setDefaultSort('arrival', 'DESC');	
	
	this.messagesStore.on('load', function(){

			this.readOnly = this.messagesGrid.store.reader.jsonData.permission_level < GO.permissionLevels.create || this.messagesGrid.store.reader.multipleFolders;
			this._permissionDelegated = this.messagesGrid.store.reader.jsonData.permission_level == GO.email.permissionLevels.delegated;

			this.permissionLevel = this.messagesGrid.store.reader.jsonData.permission_level;
			
			this.deleteButton.setDisabled(this.readOnly);
			
		}, this);		

	var messagesAtTop = Ext.state.Manager.get('em-msgs-top');
	if(messagesAtTop)
	{
		messagesAtTop = Ext.decode(messagesAtTop);
	}else
	{
		messagesAtTop =screen.width<1024;
	}

	var deleteConfig = {
		callback:function(){
			if(this.messagePanel.uid && !this.messagesGrid.store.getById(this.messagePanel.uid))
			{
				this.messagePanel.reset();
			}
		},
		scope: this
	};

	this.leftMessagesGrid = new GO.email.MessagesGrid({
		id:'em-pnl-west',
		store:this.messagesStore,
		width: 420,
		region:'west',
		hidden:messagesAtTop,
		deleteConfig : deleteConfig,
		floatable:false,
		header:false,
		collapsible:true,
		collapseMode:'mini',
		split:true
	});
	this.addGridHandlers(this.leftMessagesGrid);

	this.topMessagesGrid = new GO.email.MessagesGrid({
		id:'em-pnl-north',
		store:this.messagesStore,
		height: 250,
		region:'north',
		hidden:!messagesAtTop,
		deleteConfig : deleteConfig,
		floatable:false,
		collapsible:true,
		collapseMode:'mini',
		split:true
	});
	this.addGridHandlers(this.topMessagesGrid);

	if(!this.topMessagesGrid.hidden)
	{
		this.messagesGrid=this.topMessagesGrid;
	}else
	{
		this.messagesGrid=this.leftMessagesGrid;
	}

	//for global access by composers
	GO.email.messagesGrid=this.messagesGrid;


	this.messagesGrid.store.on("beforeload", function()
	{

		if(this.messagesGrid.store.baseParams['search'] != undefined)
		{
			GO.email.search_query = this.messagesGrid.store.baseParams['search'];
			this.searchDialog.hasSearch = false;
			delete(this.messagesGrid.store.baseParams['search']);
		}else
		if(this.searchDialog.hasSearch)
		{
			this.messagesGrid.resetSearch();
		}

		if(GO.email.search_query)
		{
			this.searchDialog.hasSearch = false;
			var search_type = (GO.email.search_type)
			? GO.email.search_type : GO.email.search_type_default;

			var query;

			if(search_type=='any'){
				//query='OR OR OR FROM "' + GO.email.search_query + '" SUBJECT "' + GO.email.search_query + '" TO "' + GO.email.search_query + '" CC "' + GO.email.search_query + '"';
				query='OR OR FROM "' + GO.email.search_query + '" SUBJECT "' + GO.email.search_query + '" TO "' + GO.email.search_query + '"';
			}else
			{
				query=search_type.toUpperCase() + ' "' + GO.email.search_query + '"';
			}

			this.messagesGrid.store.baseParams['query'] = query;
		}else
		if(!this.searchDialog.hasSearch && this.messagesGrid.store.baseParams['query'])
		{
			this.messagesGrid.resetSearch();
			delete(this.messagesGrid.store.baseParams['query']);
			delete(this.messagesGrid.store.baseParams['searchIn']);
		}

	}, this);

	this.messagesGrid.store.on('load',function(){

		var cm = this.topMessagesGrid.getColumnModel();
		var header = this.messagesGrid.store.reader.jsonData.sent || this.messagesGrid.store.reader.jsonData.drafts ? GO.email.lang.to : GO.email.lang.from;
		cm.setColumnHeader(cm.getIndexById('from'), header);

		var unseen = this.messagesGrid.store.reader.jsonData.unseen;
		for(var mailbox in unseen)
			this.updateFolderStatus(mailbox,unseen[mailbox]);

		if(this.messagesGrid.store.baseParams['query'] && this.messagesGrid.store.baseParams['query']!='' && this.searchDialog.hasSearch){
			this.resetSearchButton.setVisible(true);
		}else
		{
			this.resetSearchButton.setVisible(false);
		}

//		var selModel = this.treePanel.getSelectionModel();
//		if(!selModel.getSelectedNode())
//		{
//			var node = this.treePanel.getNodeById('folder_'+this.messagesGrid.store.reader.jsonData.mailbox);
//			if(node)
//			{
//				selModel.select(node);
//			}
//		}

		/*
		 *This method is annoying when searching for unread mails
		if(this.messagePanel.uid && !this.messagesGrid.store.getById(this.messagePanel.uid))
		{
			this.messagePanel.reset();
		}*/

		//don't confirm delete to trashfolder
		this.messagesGrid.deleteConfig.noConfirmation=!this.messagesGrid.store.reader.jsonData.deleteConfirm;
	}, this);

	GO.email.saveAsItems = GO.email.saveAsItems || [];

	for(var i=0;i<GO.email.saveAsItems.length;i++)
	{
		GO.email.saveAsItems[i].scope=this;
	}

	var addSendersItems = [{
		text:GO.email.lang.to,
		field:'to',
		handler:this.addSendersTo,
		scope:this
	},{
		text:'CC',
		field:'cc',
		handler:this.addSendersTo,
		scope:this
	},{
		text:'BCC',
		field:'bcc',
		handler:this.addSendersTo,
		scope:this
	}];

	if (GO.addressbook) {
		addSendersItems.push({
			text: GO.addressbook.lang.addresslist,
			cls: 'x-btn-text-icon',
			menu: this.addresslistsMenu = new GO.menu.JsonMenu({
				store: new GO.data.JsonStore({
					url: GO.url("addressbook/addresslist/store"),
					baseParams: {
						permissionLevel: GO.permissionLevels.write,
						forContextMenu: true
					},
					fields: ['addresslist_id', 'text'],
					remoteSort: true
				}),
				listeners:{
					scope:this,
					itemclick : function(item, e ) {
						this.addSendersToAddresslist(item.addresslist_id);
						return false;
					}
				}
			}),
			multiple:true,
			scope: this
		});
	}

	var deleteSendersItems = [];
	
	if (GO.addressbook) {
		deleteSendersItems.push({
			text: GO.addressbook.lang.addresslist,
			cls: 'x-btn-text-icon',
			menu: this.addresslistsMenu = new GO.menu.JsonMenu({
				store: new GO.data.JsonStore({
					url: GO.url("addressbook/addresslist/store"),
					baseParams: {
						permissionLevel: GO.permissionLevels.write,
						forContextMenu: true
					},
					fields: ['addresslist_id', 'text'],
					remoteSort: true
				}),
				listeners:{
					scope:this,
					itemclick : function(item, e ) {
						this.deleteSendersFromAddresslist(item.addresslist_id);
						return false;
					}
				}
			}),
			multiple:true,
			scope: this
		});
	}

	  var contextItems = [
	  this.contextMenuMarkAsRead = new Ext.menu.Item({
		  text: GO.email.lang.markAsRead,
		  handler: function(){
			  this.flagMessages('Seen', false);
		  },
		  scope:this,
		  multiple:true
	  }),
	  this.contextMenuMarkAsUnread = new Ext.menu.Item({
		  text: GO.email.lang.markAsUnread,
		  handler: function(){
			  this.flagMessages('Seen', true);
		  },
		  scope: this,
		  multiple:true
	  }),
	  this.contextMenuFlag = new Ext.menu.Item({
		  text: GO.email.lang.flag,
		  handler: function(){
			  this.flagMessages('Flagged', false);
		  },
		  scope: this,
		  multiple:true
	  }),
	  this.contextMenuUnflag = new Ext.menu.Item({
		  text: GO.email.lang.unflag,
		  handler: function(){
			  this.flagMessages('Flagged', true);
		  },
		  scope: this,
		  multiple:true
	  }),
	  '-',
	  this.contextMenuSource = new Ext.menu.Item ({
		  text: GO.email.lang.viewSource,
		  handler: function(){

			  var record = this.messagesGrid.selModel.getSelected();
			  if(record)
			  {
				  //var win = window.open(GO.url("email/message/source",{account_id:this.account_id,mailbox:this.mailbox,uid:record.data.uid}));
				  var win = window.open(GO.url("email/message/source",{account_id:this.account_id,mailbox:record.data.mailbox,uid:record.data.uid}));
				  win.focus();
			  }

		  },
		  scope: this
	  }),'-',
	  this.contextMenuCopyTo = new Ext.menu.Item ({
		  iconCls: 'btn-copy',
		  text: GO.email.lang['copyMailTo'],
		  cls: 'x-btn-text-icon',
		  handler: function(a,b,c){
			  var selectedEmails = this.messagesGrid.getSelectionModel().getSelections();
			  this.showCopyMailToDialog(selectedEmails);
		  },
		  scope: this,
		  multiple:true
	  }),
	  this.contextMenuDelete = new Ext.menu.Item({
		  iconCls: 'btn-delete',
		  text: GO.lang.cmdDelete,
		  cls: 'x-btn-text-icon',
		  handler: function(){
			  this.messagesGrid.deleteSelected();
		  },
		  scope: this,
		  multiple:true
	  }),'-',{
		  iconCls: 'btn-add',
		  text: GO.email.lang.addSendersTo,
		  cls: 'x-btn-text-icon',
		  menu: {
			  items: addSendersItems
		  },
		  multiple:true
	  },{
		  iconCls: 'btn-delete',
		  text: GO.email.lang.deleteSendersFrom,
		  cls: 'x-btn-text-icon',
		  menu: {
			  items: deleteSendersItems
		  },
		  multiple:true
	  }];

	if(GO.email.saveAsItems && GO.email.saveAsItems.length)
	{
		this.saveAsMenu = new Ext.menu.Menu({
			items:GO.email.saveAsItems
		});

		this.saveAsMenu.on('show', function(menu){
			var sm = this.messagesGrid.getSelectionModel();
			var multiple = sm.getSelections().length>1;
			var none = sm.getSelections().length==0;

			for(var i=0;i<menu.items.getCount();i++)
			{
				var item = menu.items.get(i);
				item.setDisabled(none || (!item.multiple && multiple));
			}
		}, this);

		contextItems.push({
			iconCls: 'btn-save',
			text:GO.lang.cmdSaveAs,
			menu:this.saveAsMenu,
			multiple:true
		});
	}

	this.gridContextMenu = new GO.menu.RecordsContextMenu({
		shadow: "frame",
		minWidth: 180,
		items: contextItems
	});
	
	
	this.gridContextMenu.on("show", function(){
		this.contextMenuMarkAsUnread.setDisabled(this.permissionLevel<GO.permissionLevels.create);
		this.contextMenuMarkAsRead.setDisabled(this.permissionLevel<GO.email.permissionLevels.delegated);

		this.contextMenuFlag.setDisabled(this.permissionLevel<GO.email.permissionLevels.delegated);
		this.contextMenuUnflag.setDisabled(this.permissionLevel<GO.email.permissionLevels.delegated);

		this.contextMenuDelete.setDisabled(this.readOnly);
	}, this);
	
	this.gridReadOnlyContextMenu = new GO.menu.RecordsContextMenu({
		shadow: "frame",
		minWidth: 180,
		items: [ 
		  new Ext.menu.Item ({
		  text: GO.email.lang.viewSource,
		  handler: function(){

			  var record = this.messagesGrid.selModel.getSelected();
			  if(record)
			  {
				  //var win = window.open(GO.url("email/message/source",{account_id:this.account_id,mailbox:this.mailbox,uid:record.data.uid}));
				  var win = window.open(GO.url("email/message/source",{account_id:this.account_id,mailbox:record.data.mailbox,uid:record.data.uid}));
				  win.focus();
			  }

		  },
		  scope: this
	  }),
		  '-',
		 new Ext.menu.Item ({
		  iconCls: 'btn-copy',
		  text: GO.email.lang['copyMailTo'],
		  cls: 'x-btn-text-icon',
		  handler: function(a,b,c){
			  var selectedEmails = this.messagesGrid.getSelectionModel().getSelections();
			  this.showCopyMailToDialog(selectedEmails);
		  },
		  scope: this,
		  multiple:true
	  })
		]
	});

	GO.email.treePanel = this.treePanel = new GO.email.AccountsTree({
		id:'email-tree-panel',
		region:'west',
		mainPanel:this
	});




	//select the first inbox to be displayed in the messages grid
	this.treePanel.getRootNode().on('load', function(node)
	{
		this.body.unmask();
		if(node.childNodes[0])
		{
			var firstAccountNode=false;

//			this.updateNotificationEl();

			for(var i=0;i<node.childNodes.length;i++){
				firstAccountNode = node.childNodes[i];

				if(firstAccountNode.expanded){

					firstAccountNode.on('load', function(node){

						if(node.childNodes[0])
						{
							//don't know why but it doesn't work without a 10ms delay.
							this.treePanel.getSelectionModel().select.defer(10,this.treePanel.getSelectionModel(), [node.childNodes[0]]);


//							var firstInboxNode = node.childNodes[0];
//							this.setAccount(
//								firstInboxNode.attributes.account_id,
//								firstInboxNode.attributes.mailbox,
//								firstInboxNode.parentNode.attributes.usage
//								);
						//if(!this.checkMailStarted)
						//this.checkMail.defer(this.checkMailInterval, this);
						}
					},this, {
						single: true
					});
					break;
				}
			}


		}
	}, this);

//	this.treePanel.on('beforeclick', function(node){
//		if(node.attributes.mailbox==0)
//			return false;
//	}, this);

	

	this.treePanel.getSelectionModel().on('selectionchange', function(sm, node)	{
//		if(node.attributes.mailbox>0)
//		{
			if(node){
				var usage='';

				var inboxNode =this.treePanel.findInboxNode(node);
				if(inboxNode)
					usage=inboxNode.attributes.usage;

				this.setAccount(
					node.attributes.account_id,
					node.attributes.mailbox,
					usage
					);
			}
//		}
	}, this);
	
	this.treePanel.on('click',function(node){
		var selectedNode = this.treePanel.getSelectionModel().getSelectedNode();
		
		if(selectedNode && node.id==selectedNode.id){
			var usage='';

				var inboxNode =this.treePanel.findInboxNode(node);
				if(inboxNode)
					usage=inboxNode.attributes.usage;
				
			this.setAccount(
				node.attributes.account_id,
				node.attributes.mailbox,
				usage
				);
		}
	}, this);

	this.searchDialog = new GO.email.SearchDialog({
		store:this.messagesGrid.store
	});

	this.settingsMenu = new Ext.menu.Menu({
		items:[{
			iconCls: 'btn-accounts',
			text: GO.email.lang.accounts,
			cls: 'x-btn-text-icon',
			handler: function(){
				this.showAccountsDialog();
			},
			scope: this
		},{
			iconCls:'btn-toggle-window',
			text: GO.email.lang.toggleWindowPosition,
			cls: 'x-btn-text-icon',
			handler: function(){
				this.moveGrid();
			},
			scope: this
		}]
	});

	if(GO.gnupg)
	{
		this.settingsMenu.add('-');
		this.settingsMenu.add({
			iconCls:'gpg-btn-settings',
			cls: 'x-btn-text-icon',
			text:GO.gnupg.lang.encryptionSettings,
			handler:function(){
				if(!this.securityDialog)
				{
					this.securityDialog = new GO.gnupg.SecurityDialog();
				}
				this.securityDialog.show();
			},
			scope:this
		});
	}

	var tbar =[{
	      	 	xtype:'htmlcomponent',
			html:GO.email.lang.name,
			cls:'go-module-title-tbar'
		},this.composerButton = new Ext.Button({
		iconCls: 'btn-compose',
		text: GO.email.lang['compose'],
		cls: 'x-btn-text-icon',
		handler: function(){

			GO.email.showComposer({
				account_id: this.account_id
			});
		},
		scope: this
	}),this.deleteButton = new Ext.Button({
		iconCls: 'btn-delete',
		text: GO.lang.cmdDelete,
		cls: 'x-btn-text-icon',
		handler: function(){
			this.messagesGrid.deleteSelected();
			this.messagesGrid.expand();
		},
		scope: this
	}),new Ext.Toolbar.Separator(),
	{
		iconCls: 'btn-settings',
		text:GO.lang.administration,
		menu: this.settingsMenu
	},{
		iconCls: 'btn-refresh',
		text: GO.lang.cmdRefresh,
		cls: 'x-btn-text-icon',
		handler: function(){
			this.refresh(true);
		},
		scope: this
	},
	{
		iconCls: 'btn-search',
		text: GO.lang.strSearch,
		cls: 'x-btn-text-icon',
		handler: function(){
			this.searchDialog.show();
		},
		scope: this
	},
	this.resetSearchButton = new Ext.Button({
		iconCls: 'btn-delete',
		text: GO.email.lang.resetSearch,
		cls: 'x-btn-text-icon',
		hidden:true,
		handler: function(){
			this.searchDialog.hasSearch = false;
			this.messagesGrid.store.baseParams['query']='';
			this.messagesGrid.store.baseParams['searchIn']='';
			this.messagesGrid.store.load({
				params:{
					start:0
				}
			});
		},
		scope: this
	})
	,
	'-',
	this.replyButton=new Ext.Button({
		disabled:true,
		iconCls: 'btn-reply',
		text: GO.email.lang.reply,
		cls: 'x-btn-text-icon',
		handler: function(){

			if (!this._permissionDelegated) {
				GO.email.showComposer({
					uid: this.messagePanel.uid,
					task: 'reply',
					mailbox: this.mailbox,
					account_id: this.account_id
				});
			} else {
				GO.email.showComposer({
					uid: this.messagePanel.uid,
					task: 'reply',
					mailbox: this.mailbox,
					account_id: this.account_id,
					delegated_cc_enabled: true
				});
			}
		},
		scope: this
	}),this.replyAllButton=new Ext.Button({
		disabled:true,
		iconCls: 'btn-reply-all',
		text: GO.email.lang.replyAll,
		cls: 'x-btn-text-icon',
		handler: function(){
			GO.email.showComposer({
				uid: this.messagePanel.uid,
				task: 'reply_all',
				mailbox: this.mailbox,
				account_id: this.account_id
			});
		},
		scope: this
	}),this.forwardButton=new Ext.Button({
		disabled:'true',
		iconCls: 'btn-forward',
		text: GO.email.lang.forward,
		cls: 'x-btn-text-icon',
		handler: function(){
			if (!this._permissionDelegated) {
				GO.email.showComposer({
					uid: this.messagePanel.uid,
					task: 'forward',
					mailbox: this.mailbox,
					account_id: this.account_id
				});
			} else {
				GO.email.showComposer({
					uid: this.messagePanel.uid,
					task: 'forward',
					mailbox: this.mailbox,
					account_id: this.account_id,
					delegated_cc_enabled: true
				});
			}
		},
		scope: this
	}),

	this.printButton = new Ext.Button({
		disabled: true,
		iconCls: 'btn-print',
		text: GO.lang.cmdPrint,
		cls: 'x-btn-text-icon',
		handler: function(){
			this.messagePanel.body.print();
		},
		scope: this
	})];


	if(GO.email.saveAsItems && GO.email.saveAsItems.length)
	{
		tbar.push({
			iconCls: 'btn-save',
			text:GO.lang.cmdSaveAs,
			menu:this.saveAsMenu
		});
	}

	tbar.push(new Ext.Toolbar.Separator());


	tbar.push(this.closeMessageButton = new Ext.Button({
		hidden:true,
		iconCls: 'btn-close',
		text: GO.lang.cmdClose,
		cls: 'x-btn-text-icon',
		handler: function(){
			this.messagesGrid.expand();

		},
		scope: this
	}));


	config.layout='border';
	config.tbar=new Ext.Toolbar({
		cls:'go-head-tb',
		items: tbar
	});

	this.messagePanel = new GO.email.MessagePanel({
		id:'email-message-panel',
		region:'center',
		autoScroll:true,
		titlebar: false,
		border:true,
		attachmentContextMenu: new GO.email.AttachmentContextMenu()
	});

	config.items=[
	this.treePanel,
	{
		region:'center',
		titlebar: false,
		layout:'border',
		items: [
		this.messagePanel,
		this.topMessagesGrid,
		this.leftMessagesGrid
		]
	}];
	

	this.messagePanel.on('load', function(options, success, response, data, password){
		if(!success)
		{
			this.messagePanel.uid=0;
		}else
		{
			this.messagePanel.do_not_mark_as_read = 0;
			if(!GO.util.empty(data.do_not_mark_as_read))
				this.messagePanel.do_not_mark_as_read = data.do_not_mark_as_read;
			//this.messagePanel.uid=record.data['uid'];	
			
			
			this.replyAllButton.setDisabled(this.readOnly && !this._permissionDelegated);
			this.replyButton.setDisabled(this.readOnly && !this._permissionDelegated);
			this.forwardButton.setDisabled(this.readOnly && !this._permissionDelegated);
			this.printButton.setDisabled(this.readOnly && !this._permissionDelegated);

			var record = this.messagesGrid.store.getById(this.messagePanel.uid);

			if(!record.data.seen && data.notification)
			{
				if(GO.email.alwaysRespondToNotifications || confirm(GO.email.lang.sendNotification.replace('%s', data.notification)))
				{
					GO.request({
						url: "email/message/notification",
						params: {
							account_id: this.messagePanel.account_id,
							message_to:data.to_string,
							notification_to: data.notification,
							subject: data.subject
						}
					});
				}
			}
		}

	}, this);

	this.messagePanel.on('reset', function(){
		this.replyAllButton.setDisabled(true);
		this.replyButton.setDisabled(true);
		this.forwardButton.setDisabled(true);
		this.printButton.setDisabled(true);
	}, this);


//	this.messagePanel.on('linkClicked', function(href){
//		var win = window.open(href);
//		win.focus();
//	}, this);

	this.messagePanel.on('attachmentClicked', GO.email.openAttachment, this);
	//this.messagePanel.on('zipOfAttachmentsClicked', this.openZipOfAttachments, this);


	/*this.messagePanel.on('emailClicked', function(email){
	this.showComposer({to: email});
  }, this);*/

	/*
   * for email seaching on sender from message panel
   */
	GO.email.searchSender=function(sender)
	{
		if(this.rendered)
		{
			GO.email.search_type = 'from';
			this.messagesGrid.showUnreadButton.toggle(false, true);
			this.messagesGrid.store.baseParams['search'] = sender;
			GO.email.messagesGrid.store.baseParams['unread']=0;
			this.messagesGrid.setSearchFields('from', sender);

			this.messagesGrid.store.load({
				params:{
					start:0
				}
			});

			if(GO.mainLayout.tabPanel)
				GO.mainLayout.tabPanel.setActiveTab(this.id);
		}else
		{
			alert(GO.email.lang.loadEmailFirst);
		}
	}
	GO.email.searchSender = GO.email.searchSender.createDelegate(this);

	GO.email.EmailClient.superclass.constructor.call(this, config);
};

Ext.extend(GO.email.EmailClient, Ext.Panel,{

	_permissionDelegated : false,

	moveGrid : function(){	
		if(this.topMessagesGrid.isVisible())
		{
			this.messagesGrid=this.leftMessagesGrid;
			this.messagesGrid.showUnreadButton.setText(this.topMessagesGrid.showUnreadButton.text);
			this.topMessagesGrid.hide();

		}else
		{
			this.messagesGrid=this.topMessagesGrid;
			this.messagesGrid.showUnreadButton.setText(this.leftMessagesGrid.showUnreadButton.text);
			this.leftMessagesGrid.hide();
		}
		//this.messagesGridContainer.add(this.messagesGrid);
		this.messagesGrid.show();
		this.messagesGrid.ownerCt.doLayout();

		Ext.state.Manager.set('em-msgs-top', Ext.encode(this.topMessagesGrid.isVisible()));
	},

	addGridHandlers : function(grid)
	{
		grid.on("rowcontextmenu", function(grid, rowIndex, e) {
			var coords = e.getXY();
			if(this.messagesGrid.store.reader.jsonData.permission_level <= GO.permissionLevels.read || this.messagesGrid.store.reader.jsonData.multipleFolders)
			  this.gridReadOnlyContextMenu.showAt([coords[0], coords[1]], grid.getSelectionModel().getSelections());
			else
			  this.gridContextMenu.showAt([coords[0], coords[1]], grid.getSelectionModel().getSelections());
		},this);

		grid.on('collapse', function(){
			this.closeMessageButton.setVisible(true);
		}, this);

		grid.on('expand', function(){
			this.closeMessageButton.setVisible(false);
		}, this);

		grid.on("rowdblclick", function(){
			if(this.messagesGrid.store.reader.jsonData.drafts || this.messagesGrid.store.reader.jsonData.sent)
			{
				GO.email.showComposer({
					uid: this.messagePanel.uid,
					task: 'opendraft',
					template_id: 0,
					mailbox: this.mailbox,
					account_id: this.account_id
				});
			}else
			{
				this.messagePanel.popup();
				//this.messagesGrid.collapse();
			}
		}, this);

		//this.messagesGrid.getSelectionModel().on("rowselect",function(sm, rowIndex, r){
		grid.on("delayedrowselect",function(grid, rowIndex, r){
			if(r.data['uid']!=this.messagePanel.uid)
			{
				//this.messagePanel.uid=r.data['uid'];
				//this.messagePanel.loadMessage(r.data.uid, this.mailbox, this.account_id);
				this.messagePanel.loadMessage(r.data.uid, r.data['mailbox'], this.account_id);

				if(!r.data.seen && this.messagesGrid.store.reader.jsonData.permission_level > GO.permissionLevels.read){
					//set read with 2 sec delay.
					//this.markAsRead.defer(2000, this, [r.data.uid, this.mailbox, this.account_id]);
					this.markAsRead.defer(2000, this, [r.data.uid, r.data['mailbox'], this.account_id]);
				}
			}
		}, this);
	},

	markAsRead : function(uid, mailbox, account_id){		
		if(this.messagePanel.uid==uid && this.messagePanel.mailbox==mailbox && this.messagePanel.account_id==account_id && !this.messagePanel.do_not_mark_as_read){
				GO.request({
				url: "email/message/setFlag",				
				params: {
					account_id: account_id,
					mailbox: mailbox,
					flag: "Seen",
					clear: 0,
					messages: Ext.encode([uid])
				},
				success: function(options, response,result)
				{
					var record = this.messagesGrid.store.getById(uid);
					if(record){
						record.set("seen", 1);
						record.commit();
					}

					this.updateFolderStatus(this.mailbox, result.unseen);

				},
				scope:this
			});
		}
	},

	afterRender : function(){
		GO.email.EmailClient.superclass.afterRender.call(this);

//		GO.email.notificationEl.setDisplayed(false);

		this.body.mask(GO.lang.waitMsgLoad);
	},

	onShow : function(){

//		GO.email.notificationEl.setDisplayed(false);

		GO.email.EmailClient.superclass.onShow.call(this);
	},

//	updateNotificationEl : function(){
//		var node = this.treePanel.getRootNode();
//
//		GO.email.totalUnseen=0;
//		for(var i=0;i<node.childNodes.length;i++)
//		{
//			GO.email.totalUnseen += node.childNodes[i].attributes.inbox_new;
//		}
//
//	},

	showComposer : function(values)
	{
		GO.email.showComposer(
		{
			account_id: this.account_id,
			values : values
		});
	},

	setAccount : function(account_id,mailbox, usage)
	{
		if(account_id!=this.account_id || this.mailbox!=mailbox)
		{
			this.messagePanel.reset();
			this.messagesGrid.getSelectionModel().clearSelections();
		}

		this.messagesGrid.expand();

		this.account_id = account_id;
		this.mailbox = mailbox;

		//messagesPanel.setTitle(mailbox);
		this.messagesGrid.store.baseParams['task']='messages';
		this.messagesGrid.store.baseParams['account_id']=account_id;
		this.messagesGrid.store.baseParams['mailbox']=mailbox;
		this.messagesGrid.store.load({
			params:{
				start:0
			}
		});
		//this.messagesGrid.store.load();

		this.treePanel.setUsage(usage);
	},

	getFolderNodeId : function (account_id, mailbox){

		return GO.util.Base64.encode("f_"+account_id+"_"+mailbox);
	},
	/**
	 * Returns true if the current folder needs to be refreshed in the grid
	 */
	updateFolderStatus : function(mailbox, unseen, account_id)
	{
		if(!account_id)
			account_id=this.messagesGrid.store.baseParams.account_id;
		var nodeId = this.getFolderNodeId(account_id, mailbox);
		var statusElId = "status_"+nodeId;
		var statusEl = Ext.get(statusElId);
		
	

//		var node = this.treePanel.getNodeById('folder_'+mailbox);
//		if(node && node.attributes.mailbox=='INBOX')
//		{
//			node.parentNode.attributes.inbox_new=unseen;
//		}

		if(statusEl && statusEl.dom)
		{			
			var node = this.treePanel.getNodeById(nodeId);

			if(unseen)
				node.getUI().addClass('ml-folder-unseen');
			else
				node.getUI().removeClass('ml-folder-unseen');
			
			var statusText = statusEl.dom.innerHTML;
			var current = statusText=='' ? 0 : parseInt(statusText.substring(1, statusText.length-1));

			if(current != unseen)
			{
				if(unseen>0)
				{
					statusEl.dom.innerHTML = "("+unseen+")";
				}else
				{
					statusEl.dom.innerHTML = "";
				}
				return true;
			}
		}
		return false;
	},

	incrementFolderStatus : function(mailbox, increment)
	{
		var statusElId = "status_"+this.getFolderNodeId(this.account_id, mailbox);
		var statusEl = Ext.get(statusElId);

		var statusText = statusEl.dom.innerHTML;

		var status = 0;
		if(statusText!='')
		{
			status = parseInt(statusText.substring(1, statusText.length-1));
		}
		status+=increment;

//		GO.email.totalUnseen+=increment;

		this.updateFolderStatus(mailbox, status);
//		this.updateNotificationEl();
	},




	refresh : function(refresh)
	{
		if(refresh)
			this.treePanel.loader.baseParams.refresh=true;

		this.treePanel.root.reload();
		this.messagesStore.removeAll();

		if(refresh)
			delete this.treePanel.loader.baseParams.refresh;
	},

	showAccountsDialog : function()
	{
		if(!this.accountsDialog)
		{
			this.accountsDialog = new GO.email.AccountsDialog();
			this.accountsDialog.accountsGrid.accountDialog.on('save', function(dialog, result){
				if(result.refreshNeeded){
					this.refresh();
				}
			}, this);

			this.accountsDialog.accountsGrid.on('delete', function(){
				this.refresh();
				if(GO.emailportlet)
					GO.emailportlet.foldersStore.load();
			}, this);
		}
		this.accountsDialog.show();
	},

	showCopyMailToDialog : function(selectedEmailMessages) {
		if (!this._copyMailToDialog) {
			this._copyMailToDialog = new GO.email.CopyMailToDialog();
			this._copyMailToDialog.on('copy_email',function(){
				this.messagesGrid.store.reload();
			},this);			
		}
		
		this._copyMailToDialog.show(selectedEmailMessages);
	},

	flagMessages : function (flag, clear){
		var selectedRows = this.messagesGrid.selModel.selections.keys;

		if(selectedRows.length)
		{

			GO.request({
				url: "email/message/setFlag",
				maskEl:this.getEl(),
				params: {
					account_id: this.account_id,
					mailbox: this.mailbox,
					flag: flag,
					clear: clear ? 1 : 0,
					messages: Ext.encode(selectedRows)
				},
				success: function(options, response,result)
				{
					var field;
					var value;

					var records = this.messagesGrid.selModel.getSelections();

					switch(flag)
					{
						case 'Seen':
							field='seen';
							value=!clear;

//							for(var i=0;i<records.length;i++){
//								if(records[i].get('seen')!=clear)
//									GO.email.totalUnseen-=clear;
//							}

							break;
						case 'Flagged':
							field='flagged';
							value=!clear;
							break;
					}


					for(var i=0;i<records.length;i++)
					{
						records[i].set(field, value);
						records[i].commit();
					}

					this.updateFolderStatus(this.mailbox, result.unseen);
//					this.updateNotificationEl();


				},
				scope:this
			});

		}
	},

	addSendersTo : function(menuItem){
		var records = this.messagesGrid.getSelectionModel().getSelections();

		var emails=[];
		for(var i=0;i<records.length;i++)
		{
			emails.push('"'+records[i].get('from')+'" <'+records[i].get('sender')+'>');
		}

		var activeComposer=false;
		if(GO.email.composers)
		{
			for(var i=GO.email.composers.length-1;i>=0;i--)
			{
				if(GO.email.composers[i].isVisible())
				{
					activeComposer=GO.email.composers[i];
					break;
				}
			}
		}

		if(activeComposer)
		{
			var f = activeComposer.formPanel.form.findField(menuItem.field);
			var v = f.getValue();
			if(v!='')
			{
				v+=', ';
			}
			v+=emails.join(', ');
			f.setValue(v);
			activeComposer.focus();
		}else
		{
			var config={
				values:{}
			}
			config.values[menuItem.field]=emails.join(', ');
			GO.email.showComposer(config);
		}
	},

	addSendersToAddresslist : function(addresslistId) {
		var records = this.messagesGrid.getSelectionModel().getSelections();
		var senderNames = new Array();
		var senderEmails = new Array();
		for (var i=0;i<records.length;i++) {
			senderNames.push(records[i].data.from);
			senderEmails.push(records[i].data.sender);
		}

		Ext.Ajax.request({
			url: GO.url('addressbook/addresslist/addContactsToAddresslist'),
			params: {
				senderNames: Ext.encode(senderNames),
				senderEmails: Ext.encode(senderEmails),
				addresslistId: addresslistId
			},
			callback: function(options, success, response)
			{
				if(!success)
				{
					Ext.MessageBox.alert(GO.lang.strError, response.result.errors);
				}else
				{
					var responseParams = Ext.decode(response.responseText);
					if(responseParams.success)
					{
						Ext.MessageBox.alert(GO.lang['strSuccess'],GO.addressbook.lang['addContactsSuccess'].replace('%i',responseParams['addedSenders']));
					}else
					{
						if (!GO.util.empty(responseParams.unknownSenders)) {

							if (!this.unknownRecipientsDialogForAddresslist) {
								this.unknownRecipientsDialogForAddresslist = new GO.email.UnknownRecipientsDialog();
								this.unknownRecipientsDialogForAddresslist.on('hide',function(){
									if (!GO.util.empty(this.unknownRecipientsDialogForAddresslist.addresslistId))
										delete this.unknownRecipientsDialogForAddresslist.addresslistId;
								},this);
							}

							this.unknownRecipientsDialogForAddresslist.store.loadData({
								recipients : Ext.decode(responseParams.unknownSenders)
							});

							this.unknownRecipientsDialogForAddresslist.addresslistId = addresslistId;

							this.unknownRecipientsDialogForAddresslist.show({
								title : GO.email.lang.addUnknownSenders,
								descriptionText : GO.email.lang.addUnknownSendersText,
								disableSkipUnknownCheckbox : true
							});

						} else {
							Ext.MessageBox.alert(GO.lang.strError,responseParams.feedback);
						}
					}
				}
			},
			scope: this
		});
	},
	
	deleteSendersFromAddresslist : function(addresslistId) {
		if (GO.addressbook) {
			var records = this.messagesGrid.getSelectionModel().getSelections();
			var senderEmails = new Array();
			for (var i=0;i<records.length;i++) {
				senderEmails.push(records[i].data.sender);
			}

			Ext.Ajax.request({
				url: GO.url('addressbook/addresslist/deleteContactsFromAddresslist'),
				params: {
					senderEmails: Ext.encode(senderEmails),
					addresslistId: addresslistId
				},
				callback: function(options, success, response)
				{
					var responseData = Ext.decode(response.responseText);
					if(!success) {
						Ext.MessageBox.alert(GO.lang.strError, responseData.feedback);
					} else {
						Ext.MessageBox.alert(GO.lang.strSuccess, GO.addressbook.lang['nRemovedFromAddresslist'].replace('%n',responseData.nRemoved));
					}
				},
				scope: this
			});
		}
	}
});

GO.mainLayout.onReady(function(){
	//GO.email.Composer = new GO.email.EmailComposer();

	//contextmenu when an e-mail address is clicked
	GO.email.addressContextMenu=new GO.email.AddressContextMenu();

	GO.email.search_type_default = 'any';




	//GO.checker is not available in some screens like accept invitation from calendar
	if(true){
		//create notify icon
//		var notificationArea = Ext.get('notification-area');
//		if(notificationArea)
//		{
//			GO.email.notificationEl = notificationArea.createChild({
//				id: 'ml-notify',
//				tag:'a',
//				href:'#',
//				style:'display:none'
//			});
//			GO.email.notificationEl.on('click', function(){
//				GO.mainLayout.openModule('email');
//			}, this);
//		}

			//register a new request to the checker. It will poll unseen tickets every two minutes
		GO.checker.registerRequest("email/account/checkUnseen",{},function(checker, result, data){

				var ep = GO.mainLayout.getModulePanel('email');
				
			//	var totalUnseen = result.email_status.total_unseen;
				if(ep){
					for(var i=0;i<result.email_status.unseen.length;i++)
					{
						var s = result.email_status.unseen[i];

						var changed = ep.updateFolderStatus(s.mailbox, s.unseen,s.account_id);
						if(changed && ep.messagesGrid.store.baseParams.mailbox==s.mailbox && ep.messagesGrid.store.baseParams.account_id==s.account_id)
						{
							ep.messagesGrid.store.reload();
						}
					}
				}

				if(result.email_status.has_new)
				{
					data.getParams={
						unseenEmails:result.email_status.total_unseen
					}

//					if(!ep || !ep.isVisible()){
//						GO.email.notificationEl.setDisplayed(true);
						
						data.popup=true;
						
						if(GO.util.empty(GO.settings.mute_new_mail_sound))
							data.alarm=true;
//					}

					//GO.email.notificationEl.update(result.email_status.total_unseen);
					
					
				}
				
				GO.mainLayout.setNotification('email',result.email_status.total_unseen,'green');
		});



	}
});

GO.email.aliasesStore = new GO.data.JsonStore({
	url: GO.url("email/alias/store"),
	baseParams:{limit:0},
	fields: ['id','account_id', 'from', 'name','email','html_signature', 'plain_signature','template_id'],
	remoteSort: true
});



GO.email.saveAttachment = function(attachment,panel)
	{
		if(!GO.files.saveAsDialog)
		{
			GO.files.saveAsDialog = new GO.files.SaveAsDialog();
		}
		GO.files.saveAsDialog.show({
			filename: attachment.name,
			handler:function(dialog, folder_id, filename){

				GO.request({
					maskEl:dialog.el,
					url: 'email/message/saveAttachment',
					params:{
						//task:'save_attachment',
						uid: panel.uid,
						mailbox: panel.mailbox,
						number: attachment.number,
						encoding: attachment.encoding,
						type: attachment.type,
						subtype: attachment.subtype,
						account_id: panel.account_id,
						uuencoded_partnumber: attachment.uuencoded_partnumber,
						folder_id: folder_id,
						filename: filename,
						charset:attachment.charset,
						sender:panel.data.sender,
						filepath:panel.data.path//smime message are cached on disk
					},
					success: function(options, response, result)
					{
						dialog.hide();
					},
					scope:this
				});
			},
			scope:this
		});
	}

GO.email.openAttachment = function(attachment, panel, forceDownload)
	{
		if(!panel)
			return false;
		
		if(!attachment)
			return false;

		var params = {
			action:'attachment',
			account_id: panel.account_id,
			mailbox: panel.mailbox,
			uid: panel.uid,
			number: attachment.number,
			uuencoded_partnumber: attachment.uuencoded_partnumber,
			encoding: attachment.encoding,
			type: attachment.type,
			subtype: attachment.subtype,
			filename:attachment.name,
			charset:attachment.charset,
			sender:panel.data.sender, //for gnupg and smime,
			filepath:panel.data.path ? panel.data.path : '' //In some cases encrypted messages are temporary stored on disk so the handlers must use that to fetch the data.
		}

		var url_params = '?';
		for(var name in params){
			url_params+= name+'='+encodeURIComponent(params[name])+'&';
		}
		url_params = url_params.substring(0,url_params.length-1);

		if(!forceDownload && attachment.mime=='message/rfc822')
		{
			GO.email.showMessageAttachment(0, params);
		}else
		{
			switch(attachment.extension)
			{
				case 'png':
				case 'bmp':
				case 'png':
				case 'gif':
				case 'jpg':
				case 'jpeg':

					if(GO.files && !forceDownload)
					{
						if(!this.imageViewer)
						{
							this.imageViewer = new GO.files.ImageViewer({
								closeAction:'hide'
							});
						}

						var index = 0;
						var images = Array();
						if(panel)
						{
							for (var i = 0; i < panel.data.attachments.length;  i++)
							{
								var r = panel.data.attachments[i];
								var ext = GO.util.getFileExtension(r.name);

								if(ext=='jpg' || ext=='png' || ext=='gif' || ext=='bmp' || ext=='jpeg')
								{
									images.push({
										name: r.name,
										src: r.url+'&inline=0'
									});
								}
								if(r.name==attachment.name)
								{
									index=images.length-1;
								}
							}
							this.imageViewer.show(images, index);
							break;
						}
					}

				default:
					if(forceDownload)
						attachment.url+='&inline=0';
					if (attachment.extension!='vcf'||forceDownload)
						window.open(attachment.url);
					break;
			}
		}
	};




/**
 * Function that will open an email composer. If a composer is already open it will create a new one. Otherwise it will reuse an already created one.
 */
GO.email.showComposer = function(config){

	config = config || {};

	GO.email.composers = GO.email.composers || [];

	var availableComposer;
		this.selectFiles = config.selectFilesFromFolderID;

	for(var i=0;i<GO.email.composers.length;i++)
	{
		if(!GO.email.composers[i].isVisible())
		{
			availableComposer=GO.email.composers[i];
			break;
		}
	}


	if(!availableComposer)
	{
		config.move=30*GO.email.composers.length;

		availableComposer = new GO.email.EmailComposer();
		availableComposer.on('send', function(composer){
			if(composer.sendParams.reply_uid && composer.sendParams.reply_uid>0)
			{
				var record = GO.email.messagesGrid.store.getById(composer.sendParams.reply_uid);
				if(record)
				{
					record.set('answered',true);
				}
			}

			if(composer.sendParams.forward_uid && composer.sendParams.forward_uid>0)
			{
				var record = GO.email.messagesGrid.store.getById(composer.sendParams.forward_uid);
				if(record)
				{
					record.set('forwarded',true);
				}
			}

			if(GO.email.messagesGrid && GO.email.messagesGrid.store.loaded && (GO.email.messagesGrid.store.reader.jsonData.sent || (GO.email.messagesGrid.store.reader.jsonData.drafts && composer.sendParams.draft_uid && composer.sendParams.draft_uid>0)))
			{
				GO.email.messagesGrid.store.reload();
			}
		});

		availableComposer.on('save', function(composer){

			if(GO.email.messagesGrid && GO.email.messagesGrid.store.loaded && GO.email.messagesGrid.store.reader.jsonData.drafts)
			{
				GO.email.messagesGrid.store.reload();
			}
		});

		availableComposer.on('dialog_ready', function(composer)
		{
			if(this.selectFiles)
			{
				GO.files.selectFilesDialog.show(this.selectFiles);
			}
		},this);

		GO.email.composers.push(availableComposer);
	}

	availableComposer.show(config);

	return availableComposer;
}

GO.email.extraTreeContextMenuItems = [];

GO.moduleManager.addModule('email', GO.email.EmailClient, {
	title : GO.lang.strEmail,
	iconCls : 'go-tab-icon-email'
});

GO.quickAddPanel.addButton(new Ext.Button({
		iconCls:'img-email-add',
		cls: 'x-btn-icon',
		tooltip:GO.email.lang.email,
		handler: function(){
			GO.email.showComposer();
		}, 
		scope: this
	}),0);


GO.email.showAddressMenu = function(e, email, name)
{
	var e = Ext.EventObject.setEvent(e);
	e.preventDefault();
	GO.email.addressContextMenu.showAt(e.getXY(), email, name);
}

GO.newMenuItems.push({
	itemId : 'email',
	text: GO.email.lang.email,
	iconCls: 'go-model-icon-GO_Email_Model_ImapMessage',
	handler:function(item, e){
		var taskShowConfig = GO.email.getTaskShowConfig(item);

//		if(GO.settings.modules.savemailas.read_permission)
//			taskShowConfig.values.subject='[id:'+item.parentMenu.link_config.modelNameAndId+'] ';

		GO.email.showComposer(taskShowConfig);
	}
},{
	itemId : 'email-files',
	text: GO.email.lang.emailFiles,
	iconCls: 'em-btn-email-files',
	handler:function(item, e){
		var panel = item.parentMenu.panel;

		if (panel.model_name == 'GO_Files_Model_File') {
			GO.request({
				url:'files/file/display',
				maskEl:panel.ownerCt.getEl(),
				params:{
					id: panel.data.id
				},
				success:function(response, options, result){
					GO.email.emailFiles(result.data.path, this);
				},
				scope: this
			});
		} else {
			GO.request({
				url:'files/folder/checkModelFolder',
				maskEl:panel.ownerCt.getEl(),
				params:{
					mustExist:false,
					model: panel.model_name,
					id: panel.data.id
				},
				success:function(response, options, result){
					GO.email.openFolderTree(result.files_folder_id, 0, this);
				},
				scope: this
			});
		}
	}
});

GO.email.getTaskShowConfig = function(item) {

	var taskShowConfig = {};

	if (Ext.isDefined(item)) {
		
		if(item.itemId && item.parentMenu.showConfigs[item.itemId]){
			taskShowConfig = item.parentMenu.showConfigs[item.itemId];
		}else{		
			taskShowConfig = item.parentMenu.taskShowConfig || {};
		}
		taskShowConfig.link_config=item.parentMenu.link_config
	}

	taskShowConfig.values={};

	if (Ext.isDefined(item)) {

		taskShowConfig.values={};
		if(typeof(item.parentMenu.panel)!='undefined' && typeof(item.parentMenu.panel.data.email)!='undefined'){
			var to='';
			if(item.parentMenu.panel.data.full_name){
				to='"'+item.parentMenu.panel.data.full_name+'" <'+item.parentMenu.panel.data.email+'>';
			}else if(item.parentMenu.panel.data.name){
				to='"'+item.parentMenu.panel.data.name+'" <'+item.parentMenu.panel.data.email+'>';
			}

			taskShowConfig.values.to=to;
		}
	}

	return taskShowConfig;
}
//files is array of relative paths
GO.email.emailFiles = function(files, item) {
	if (!Ext.isArray(files)) {
		files = new Array(files);
	}

	var composerConfig = GO.email.getTaskShowConfig(item);

	var c = GO.email.showComposer(composerConfig);

	c.on('dialog_ready', function(){
		c.emailEditor.attachmentsView.afterUpload({
			addFileStorageFiles: Ext.encode(files)
		});
	},this,{single:true});
}

GO.email.openFolderTree = function(id, folder_id, referenceItem) {

	if (!GO.email.treeFileBrowser) {
		GO.email.treeFileBrowser = new GO.Window({
			title: GO.files.lang.fileBrowser,
			height:500,
			width:400,
			layout:'fit',
			border:false,
			maximizable:true,
			collapsible:true,
			closeAction:'hide',
			items: [
				GO.email.folderTree = new GO.files.TreeFilePanel()
			],
			listeners:{
				show:function(){
					this.btnSelectAll.toggle(false);
				},
				scope:this
			},
			tbar: new Ext.Toolbar({
				cls:'go-head-tb',
				region:'north',
				items:[{
					iconCls: 'btn-refresh',
					text: GO.lang.cmdRefresh,
					cls: 'x-btn-text-icon',
					handler: function() {
						GO.email.folderTree.getRootNode().reload()
						this.btnSelectAll.toggle(false);
					},
					scope: this
				},
				this.btnSelectAll = new Ext.Button({
					iconCls: 'btn-select-all',
					text: GO.lang.selectAll,
					cls: 'x-btn-text-icon',
					enableToggle: true,
					pressed: false,
					toggleHandler: function(btn, state) {
						GO.email.folderTree.getRootNode().cascade(function(n) {
							n.getUI().toggleCheck(state);
						});
					},
					scope: this
				})
				]
			}),
			buttons:[{
				text: GO.lang['cmdOk'],
				handler: function(){

					var selFiles = new Array();
					var selNodes = GO.email.folderTree.getChecked();

					Ext.each(selNodes, function(node) {
						selFiles.push(node.attributes.path);
					});

					GO.email.emailFiles(
						selFiles,
						this.treeFileBrowser.referenceItem
					);
					GO.email.treeFileBrowser.hide();
				},
				scope:this
			}]
		});
	}

	GO.email.folderTree.getLoader().baseParams.root_folder_id=id;
	GO.email.folderTree.getLoader().baseParams.expand_folder_id=folder_id;
	GO.email.folderTree.getRootNode().reload({
		callback:function(){
			delete GO.email.folderTree.getLoader().baseParams.expand_folder_id;
		},
		scope:this
	});

	if (!referenceItem)
		referenceItem = {};

	GO.email.treeFileBrowser.referenceItem = referenceItem;
	GO.email.treeFileBrowser.show();
}

GO.email.showMessageAttachment = function(id, remoteMessage){

	if(!GO.email.linkedMessagePanel){
		GO.email.linkedMessagePanel = new GO.email.LinkedMessagePanel();

		GO.email.linkedMessageWin = new GO.Window({
			maximizable:true,
			collapsible:true,
			stateId:'em-linked-message-panel',
			title: GO.email.lang.emailMessage,
			height: 500,
			width: 800,
			closeAction:'hide',
			layout:'fit',
			items: GO.email.linkedMessagePanel
		});
	}

	if(!remoteMessage)
		remoteMessage={};

	GO.email.linkedMessagePanel.remoteMessage=remoteMessage;
	GO.email.linkedMessageWin.show();
	GO.email.linkedMessagePanel.load(id, remoteMessage);
}


GO.email.showAttendanceWindow=function(event_id){
	if(!GO.email.attendanceWindow){
		GO.email.attendanceWindow = new GO.calendar.AttendanceWindow ();
	}			
	GO.email.attendanceWindow.show(event_id);
}
