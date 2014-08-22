<?php


/**
 * This class keeps track of the authorisations that are made for some 
 * controller actions that need to be available for sessions that don't have a 
 * user logged in.
 * 
 * For example: The action to process plupload uploads should be authorised for 
 * users that have created a ticket and are not logged in.
 */
class GO_Base_Authorized_Actions{
	
	/**
	 * Check if the current session is authorized to process an controller action.
	 * 
	 * @param string $name
	 * @return boolean is authorisation granted or not.
	 */
	public static function isAuthorized($name){
		if(!empty(GO::session()->values['Authorized'])){
			if(in_array($name, GO::session()->values['Authorized'])){
				return true;
			}
		}
		return false;
	}
	
	/**
	 * Set an authorization for an action so the current session is authorized to 
	 * process the action.
	 * 
	 * @param string $name 
	 */
	public static function setAuthorized($name){
		if(empty(GO::session()->values['Authorized']))
			GO::session()->values['Authorized'] = array();
		
		GO::session()->values['Authorized'][] = $name;
	}
}