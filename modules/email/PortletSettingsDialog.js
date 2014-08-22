GO.email.PortletSettingsDialog = Ext.extend(GO.Window, {
	
	width: 300,
	
	height: 400,
		
	initComponent : function(){	
		
		this.foldersTree = new Ext.tree.TreePanel({
			animate : true,
			border : false,
			autoScroll : true,
			layout:'fit',
			height : 400,
//			autoHeight:true,
			loader : new GO.base.tree.TreeLoader({
				dataUrl : GO.url("email/portlet/portletTree"),
				preloadChildren : true,
				listeners : {
					beforeload : function() {
						this.body.mask(GO.lang.waitMsgLoad);
					},
					load : function() {
						this.body.unmask();
					},
					scope : this
				}
			})
		});
		
		// set the root node
		this.rootNode = new Ext.tree.AsyncTreeNode({
			text : GO.email.lang.root,
			draggable : false,
			id : 'root',
			expanded : true
		});
		
		this.foldersTree.setRootNode(this.rootNode);

		this.rootNode.on('load', function() {
			this.rootNode.select();

		}, this);
		
		this.foldersTree.on('checkchange', function(node, checked) {
		
			var route = checked ? 'email/portlet/enablePortletFolder' : 'email/portlet/disablePortletFolder';

			GO.request({
				maskEl:this.body,
				url : route,
				params : {
					account_id : node.attributes.account_id,
					mailbox : node.attributes.mailbox
				},
				fail:function(){
					this.foldersTree.getRootNode().reload();
				},
				scope : this
			});

		}, this);
		


		GO.email.PortletSettingsDialog.superclass.initComponent.call(this);
		
		this.add(this.foldersTree);
		
	}
	
});