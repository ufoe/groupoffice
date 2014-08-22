<?php
class GO_Base_View_Extjs3{
	public function getTheme(){
		return new GO_Base_View_Theme();
	}
	
	public function getThemeNames(){
		$folder = new GO_Base_Fs_Folder(GO::config()->root_path.'views/Extjs3/themes');
		$items = $folder->ls();
		$themes=array();
		foreach($items as $folder){
			if($folder->isFolder() && $folder->child('Layout.php')){
				$themes[] = $folder->name();				
			}	
		}
		
		return $themes;
	}
	
	public function getName(){
		return 'Extjs3';
	}
	
	public function getPath(){
		return GO::config()->root_path.'views/Extjs3/';
	}
	
	public function getUrl(){
		return GO::config()->host.'views/Extjs3/';
	}
	
	private $_stylesheets=array();
	
	private function _replaceUrl($css, $baseurl){
		return preg_replace_callback('/url[\s]*\(([^\)]*)\)/iU', 
			function($matches) use($baseurl) { 
				return GO_Base_View_Extjs3::_replaceUrlCallback($matches[1], $baseurl);
			}, $css);
		 //return preg_replace('/url[\s]*\(([^\)]*)\)/ieU', "GO_Base_View_Extjs3::_replaceUrlCallback('$1', \$baseurl)", $css);
	}

	public static function _replaceUrlCallback($url, $baseurl){
		return 'url('.$baseurl.trim(stripslashes($url),'\'" ').')';
	}

	function addStylesheet($path){

//		echo '<!-- '.$path.' -->'."\n";

//		go_debug('Adding stylesheet: '.$path);

		$this->_stylesheets[]=$path;
	}

	public function loadModuleStylesheets($derrived_theme=false){
	
		$modules = GO::modules()->getAllModules(true);
		foreach($modules as $module)
		{
			$path = $module->moduleManager->path();
			if(file_exists($path.'themes/Default/style.css')){
				$this->addStylesheet($path.'themes/Default/style.css');
			}
			
			$theme = $this->getTheme()->getName();

			if($theme!='Default'){
				if($derrived_theme && file_exists($path.'themes/'.$derrived_theme.'/style.css')){
					$this->addStylesheet($path.'themes/'.$derrived_theme.'/style.css');
				}
				if(file_exists($path.'themes/'.$theme.'/style.css')){
					$this->addStylesheet($path.'themes/'.$theme.'/style.css');
				}
			}
			
			
			//double for compatibility with new views. This entire file will be deprecated at some point.
			if(file_exists($path.'views/Extjs3/themes/Default/style.css')){
				$this->addStylesheet($path.'views/Extjs3/themes/Default/style.css');
			}

			if($theme!='Default'){
				if($derrived_theme && file_exists($path.'views/Extjs3/themes/'.$derrived_theme.'/style.css')){
					$this->addStylesheet($path.'views/Extjs3/themes/'.$derrived_theme.'/style.css');
				}
				if(file_exists($path.'views/Extjs3/themes/'.$theme.'/style.css')){
					$this->addStylesheet($path.'views/Extjs3/themes/'.$theme.'/style.css');
				}
			}
		}
	}

	public function getCachedStylesheet(){
		
		
		$modules = GO::modules()->getAllModules(true);
		
		$mods='';
		foreach($modules as $module) {
			$mods.=$module->id;
		}

		$hash = md5(GO::config()->mtime.$mods);

		$cacheFolder = GO::config()->getCacheFolder();
		$cssFile = $cacheFolder->createChild($hash.'-'.$this->getTheme()->getName().'-style.css');
	
		
		if(!$cssFile->exists() || GO::config()->debug){
			$css = '';
			//$fp = fopen($cssFile->path(), 'w+');
			foreach($this->_stylesheets as $s){
				
				
				$baseurl = str_replace(GO::config()->root_path, GO::config()->host, dirname($s)).'/';
				$css .= $this->_replaceUrl(file_get_contents($s),$baseurl);
				//fputs($fp, $this->_replaceUrl(file_get_contents($s),$baseurl));
			}
			//fclose($fp);
			
			if(GO::config()->minify){
				$cssMin = new GO_Base_Util_Minify_CSSMin();
				$css = $cssMin->run($css);
			}
			
			$cssFile->putContents($css);
		}
		
		

		//$cssurl = $GLOBALS['GO_CONFIG']->host.'compress.php?file='.basename($relpath);
		$cssurl = GO::url('core/compress',array('file'=>$cssFile->name(),'mtime'=>$cssFile->mtime()));
		
		return $cssurl;
		
	}
	
	
	public function exportModules(){
		//$GLOBALS['GO_MODULES']->modules
						
		$modules = GO::modules()->getAllModules(true);
		
		$arr = array();
		
		foreach($modules as $module){
			$arr[$module->id]=$module->getAttributes();
			
			$arr[$module->id]['url']=GO::config()->host.'modules/'.$module->id.'/';
			$arr[$module->id]['path']=GO::config()->root_path.'modules/'.$module->id.'/';
			$arr[$module->id]['full_url']=GO::config()->full_url.'modules/'.$module->id.'/';
			
			$arr[$module->id]['permission_level']=$module->permissionLevel;
			$arr[$module->id]['read_permission']=$module->permissionLevel>=GO_Base_Model_Acl::READ_PERMISSION;
			$arr[$module->id]['write_permission']=$module->permissionLevel>=GO_Base_Model_Acl::WRITE_PERMISSION;
			
		}
		
		return $arr;
	}
}
