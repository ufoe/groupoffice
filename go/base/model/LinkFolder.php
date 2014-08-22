<?php
/*
 * Copyright Intermesh BV.
 *
 * This file is part of Reminder-Office. You should have received a copy of the
 * Reminder-Office license along with Reminder-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 *
 */

/**
 * 
 * The GO_Base_Model_LinkFolder model
 * 
 * 
 * @version $Id: Reminder.php 7607 2011-08-04 13:41:42Z mschering $
 * @copyright Copyright Intermesh BV.
 * @author Merijn Schering <mschering@intermesh.nl>
 * @package GO.base.model
 * @property int $parent_id
 * @property int $model_id
 * @property int $model_type_id
 * @property string $name
 */
class GO_Base_Model_LinkFolder extends GO_Base_Db_ActiveRecord {

	/**
	 * Returns a static model of itself
	 * 
	 * @param String $className
	 * @return GO_Base_Model_LinkFolder 
	 */
	public static function model($className=__CLASS__)
	{	
		return parent::model($className);
	}
  
	public function tableName() {
		return 'go_link_folders';
	}
	
	public function relations() {
		return array(
				'children' => array('type'=>self::HAS_MANY, 'model'=>'GO_Base_Model_LinkFolder', 'field'=>'parent_id', 'delete'=>true)
				);
	}
	
	public function hasChildren(){
		$first = $this->children(GO_Base_Db_FindParams::newInstance()->single());
		
		return $first!=false;
	}
}