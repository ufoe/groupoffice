<?php
/**
 * Group-Office
 * 
 * Copyright Intermesh BV. 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @license AGPL/Proprietary http://www.group-office.com/LICENSE.TXT
 * @link http://www.group-office.com
 * @copyright Copyright Intermesh BV
 * @version $Id: Number.php 7962 2011-08-24 14:48:45Z mschering $
 * @author Merijn Schering <mschering@intermesh.nl>
 * @package GO.base
 */

/**
 * Manage a Group-Office session
 * 
 * @author Merijn Schering <mschering@intermesh.nl>
 * @version $Id: config.class.inc.php 7687 2011-06-23 12:00:34Z mschering $
 * @copyright Copyright Intermesh BV.
 * @package GO.base 
 */

class GO_Base_Session extends GO_Base_Observable{
	
	public $values;
	
	private $_user;
	
	public function __construct(){
		$this->start();
	}
	
	public function restart(){
		$this->values=array();
		$this->start();
	}
	
	public function start(){
		//start session
		
		//In some cases it doesn't make sense to use the session because the client is
		//not capable. (WebDAV for example).
		if(!defined("GO_NO_SESSION")){
			if(!isset($_SESSION)) {
				
				//without cookie_httponly the cookie can be accessed by malicious scripts 
				//injected to the site and its value can be stolen. Any information stored in 
				//session tokens may be stolen and used later for identity theft or
				//user impersonation.
				ini_set("session.cookie_httponly",1);
				
				//Avoid session id in url's to prevent session hijacking.
				ini_set('session.use_only_cookies',1);
								
				if(isset($_REQUEST['GOSID'])){
					session_id($_REQUEST['GOSID']);				
				}
								
				session_name('groupoffice');
				session_start();				
			
				if(isset($_REQUEST['GOSID'])){
					if(!isset($_REQUEST['security_token']) || $_SESSION['GO_SESSION']['security_token']!=$_REQUEST['security_token']){
						throw new GO_Base_Exception_SecurityTokenMismatch();
					}
				}		
			}
			//GO::debug causes endless loop
			//GO::debug("Started session");
		}
		
		$this->values = &$_SESSION['GO_SESSION'];
		
		if(!isset($this->values['security_token'])){
			
			//this log here causes endless loop and segfaults
			//$this->_log("security_token");
			$this->values['security_token']=GO_Base_Util_String::randomPassword(20,'a-z,A-Z,1-9');				
		}
	}
	
	/**
	 * Return security token value that should be passed with each request.
	 * 
	 * eg. index.php?r=test&security_token=token
	 * 
	 * @return string
	 */
	public function securityToken(){
		return $this->values['security_token'];
	}
	
	/**
	 * Return session ID
	 * 
	 * @return string
	 */
	public function id(){
		return session_id();
	}
	
	/**
	 * Attemts to login with stored cookies on the client.
	 * This function is called in index.php
	 * 
	 * @return GO_Base_Model_User 
	 */
	public function loginWithCookies(){
		if(empty(GO::session()->values['user_id']) && !empty($_COOKIE['GO_UN']) && !empty($_COOKIE['GO_UN'])){
			$username = GO_Base_Util_Crypt::decrypt($_COOKIE['GO_UN']);
			$password = GO_Base_Util_Crypt::decrypt($_COOKIE['GO_PW']);

			//decryption might fail if mcrypt is not installed
			if(!$username){
				$username = $_COOKIE['GO_UN'];
				$password = $_COOKIE['GO_PW'];
			}
			
			GO::debug("Attempting login with cookies for ".$username);
			
			$user = $this->login($username, $password, false);
			if(!$user)
				$this->_unsetRemindLoginCookies ();
			else
				return $user;
		}
	}
	
	/**
	 * Erases the temporary files directory for the currently logged on user. 
	 */
	public function clearUserTempFiles($recreate=true){
		if(GO::user()){					
			GO::config()->getTempFolder(false)->delete();
			if($recreate)
				GO::config()->getTempFolder();
		}
	}
	
	private function _unsetRemindLoginCookies(){
		GO_Base_Util_Http::unsetCookie('GO_UN');
		GO_Base_Util_Http::unsetCookie('GO_PW');		
	}
	
	/**
	 * Log the current user out.
	 *
	 * @access public
	 * @return void
	 */
	public function logout() {
		
//		$username = isset(self::$username) ? self::$username : 'notloggedin';		
		$username = GO::user() ? GO::user()->username : 'notloggedin';				
		
		GO::debug("Logout called for ".$username);
		
		if(!empty(GO::session()->values['countLogin']))
			$this->_log(GO_Log_Model_Log::ACTION_LOGOUT);

		$old_session = $_SESSION;
		$_SESSION=array();
		$this->values=&$_SESSION;
		
		if (ini_get("session.use_cookies") && !headers_sent()) {
			//rRemove session cookie. PHP does not remove this automatically.
			$params = session_get_cookie_params();
			setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
		}
		
		if(session_id()!='')
			session_destroy();
		
		if(!headers_sent()){
			$this->_unsetRemindLoginCookies();
		}
		//start new session
		$this->start();

		$this->fireEvent('logout', array($old_session));
		
		
		
		GO::infolog("LOGOUT for user: \"".$username."\" from IP: ".$_SERVER['REMOTE_ADDR']);
	}
	
	/**
	 * Get the logged in user
	 *
	 * @return GO_Base_Model_User The logged in user model
	 */
	public function user(){
		if(empty($this->values['user_id'])){
			return false;
		}else{		
			
			//also check if the user_id matches because GO::session()->runAsRoot() may haver changed it.
			if(empty($this->_user) || $this->_user->id!=$this->values['user_id']){
				
//				$cacheKey = 'GO_Base_Model_User:'.GO::session()->values['user_id'];
//				$cachedUser = GO::cache()->get($cacheKey);
//				
//				if($cachedUser){
////					GO::debug("Returned cached user");
//					self::$_user=$cachedUser;
//				}else
//				{
					$this->_user = GO_Base_Model_User::model()->findByPk($this->values['user_id'], array(), true);
//					GO::cache()->set($cacheKey, self::$_user);
//				}
			}

			return $this->_user;
		}
	}
	
	/**
	 * Logs a user in.
	 * 
	 * @param string $username
	 * @param string $password
	 * @return GO_Base_Model_User or false on failure.
	 */
	public function login($username, $password, $countLogin=true) {
		
		if(!$this->fireEvent('beforelogin', array($username, $password)))
			return false;			
		
		$user = GO_Base_Model_User::model()->findSingleByAttribute('username', $username);
		
		$success=true;
		
		if (!$user){
			GO::debug("LOGIN: User ".$username." not found");
			$success=false;
		}elseif(!$user->enabled){
			GO::debug("LOGIN: User ".$username." is disabled");
			$success=false;
		}elseif(!$user->checkPassword($password)){
			GO::debug("LOGIN: Incorrect password for ".$username);
			$success=false;
		}
		
		$str = "LOGIN ";		
		$str .= $success ? "SUCCESS" : "FAILED" ;		
		$str .= " for user: \"" . $username . "\" from IP: ";
		if(isset($_SERVER['REMOTE_ADDR']))
			$str .= $_SERVER['REMOTE_ADDR'];
		else
			$str .= 'unknown';
		GO::infolog($str);
		GO::debug($str);
		
		if(!$success){
			return false;
		}else
		{			
			$this->_user=$user;
			$this->setCurrentUser($user->id);
			
			GO::language()->setLanguage($user->language);

			if($countLogin){
				$user->lastlogin=time();
				$user->logins++;
				$user->save(true);
				
				$this->clearUserTempFiles();
			}

			$this->fireEvent('login', array($username, $password, $user));
			
			//A PHP variable named “session.use_only_cookies” controls the behaviour
			//of session_start(). When this variable is enabled (true) then session_start() on-
			//ly uses the cookies of a request for retrieving the session ID. If this variable is disa-
			//bled, then GET or POST requests can contain the session ID and can be used for
			//session fixation. This PHP variable was added in PHP 4.3.0 but is enabled by default
			//only since PHP 5.3.0. Environments with previous PHP versions, as well as non-
			//default PHP configurations are vulnerable to the session fixation attack described in
			//this finding if further measures are not taken.
			//In addition to only accepting session IDs in the form of cookies, the application
			//should force the re-generation of session IDs upon successful user authentication.
			//This way, an attacker would not be able to create a session ID that will be reused by
			//the application to identify a valid authenticated session. This is possible in PHP by
			//using the session_regenerate_id() function.

			if(PHP_SAPI!='cli' && !defined('GO_NO_SESSION'))
				session_regenerate_id();
			
			if($countLogin)
				$this->_log(GO_Log_Model_Log::ACTION_LOGIN);
			
			GO::session()->values['countLogin']=$countLogin;
			
			
			
			return $user;
		}		
	}
	
	private function _log($action){
		if(GO::modules()->isInstalled('log')){	
			$log = new GO_Log_Model_Log();			
			$log->action=$action;						
			$log->save();
		}
	}
	
	/**
	 * Close writing to session so other concurrent requests won't be blocked.
	 * When a PHP session is open the webserver won't process a new request until 
	 * the session is closed again.
	 */
	public function closeWriting(){	
		GO::debug("Session writing closed");
		session_write_close();
	}
	
	/**
	 * Run the current action as root. This function will close session writing to prevent
	 * the user becoming root permanently. So you can't set session variables.
	 */
	public function runAsRoot(){
		self::runAs(1);
	}
	
	/**
	 * Run the current action as another user. This function will close session writing to prevent
	 * the user becoming root permanently. So you can't set session variables.
	 */
	public function runAs($id){
		
		GO::session()->closeWriting();
		
		//Close session writing so that the user won't stay root in browser sessions.
		if(!isset($this->values['user_id']) || $id!=$this->values['user_id']){
			$debug = !empty(GO::session()->values['debug']);
			$debugSql = !empty(GO::session()->values['debugSql']);

			
			GO::session()->values=array('debug'=>$debug, 'debugSql'=>$debugSql);
			GO::session()->setCurrentUser($id);
		}
	}
	
	/**
	 * Sets current user for the entire session. Use it wisely!
	 * @param int/GO_Base_Model_User $user_id
	 */
	public function setCurrentUser($user_id) {
		
//		if(GO::modules()->isInstalled("log"))
//			GO_Log_Model_Log::create ("setcurrentuser", "Set user ID to $user_id");
	
		if($user_id  instanceof GO_Base_Model_User){
			$this->_user=$user_id;
			$this->values['user_id']=$user_id->id;
		}else
		{
			//remember user id in session
			$this->values['user_id']=$user_id;
		}
		
		
		
		if(!GO::user())
			throw new Exception("Could not set user with id ".$user_id." in GO_Base_Session::setCurrentUser()!");
		
		//for logging
		GO::session()->values['username']=GO::user()->username;
	}
}