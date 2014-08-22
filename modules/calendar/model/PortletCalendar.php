<?php
/*
 * Copyright Intermesh BV.
 *
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 */
 
/**
 * The GO_Calendar_Model_PortletCalendar model
 *
 * @package GO.modules.Calendar
 * @version $Id: PortletCalendar.php 7607 2011-09-20 10:07:07Z wsmits $
 * @copyright Copyright Intermesh BV.
 * @author Wesley Smits wsmits@intermesh.nl
 *
 * @property int $user_id
 * @property int $tasklist_id
 * @property int $calendar_id
 */

class GO_Calendar_Model_PortletCalendar extends GO_Base_Db_ActiveRecord {
	
	/**
	 *
	 * @param type $className
	 * @return GO_Calendar_Model_PortletCalendar 
	 */
	public static function model($className=__CLASS__)
	{	
		return parent::model($className);
	}
	
	public function primaryKey() {
		return array('calendar_id','user_id');
	}
	
	public function tableName() {
		return 'su_visible_calendars';
	}
	
	public function relations() {
		return array(
			'calendar' => array('type' => self::BELONGS_TO, 'model' => 'GO_Calendar_Model_Calendar', 'field' => 'calendar_id', 'delete' => false),
			);
	}
	
}