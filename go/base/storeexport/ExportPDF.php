<?php
/*
 * Copyright Intermesh BV.
 *
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 *
 * If you have questions write an e-mail to info@intermesh.nl
 *
 */

/**
 * PDF Output stream.
 * 
 * @version $Id: ExportPDF.php 7607 2011-08-04 13:41:42Z wsmits $
 * @copyright Copyright Intermesh BV.
 * @author Wesley Smits <wsmits@intermesh.nl>
 * @package GO.base.export
 */
class GO_Base_Storeexport_ExportPDF extends GO_Base_Storeexport_AbstractExport {

	public static $showInView = true;
	public static $name = "PDF";
	public static $useOrientation=true;

	private function _write($data) {
		$html = '';
		if($this->header) {
			$html .= '<tr nobr="true">';
			foreach($data as $column)
				$html .=  "<th>$column</th>";
			$html .=  "</tr>";
			$this->header = false;
		} else {
			$html .=  '<tr nobr="true">';
			foreach($data as $column)
				$html .=  "<td>$column</td>";
			$html .=  "</tr>";
		}
		return $html;
	}	
	
	public function output(){
		
		$html = '<table border="1" cellspacing="0" cellpadding="2">';
	
		if($this->header)
		{
			if($this->humanHeaders)
				$html .= $this->_write(array_values($this->getLabels()));
			else
				$html .= $this->_write(array_keys($this->getLabels()));
		}
		
		
		while($record = $this->store->nextRecord()){
			$record = $this->prepareRecord($record);
			$html .= $this->_write($record);
		}
		
		$html .= "</table>";
		
		$this->_createPDF($html);
	}
	
	private function _createPDF($html) {
		// The standard orientation is Portret
		$orientation='P';
		
		if(!empty($this->orientation)){
			$orientation = $this->orientation;
		}
		
		$pdf = new GO_Base_Util_Pdf($orientation, $unit='mm', $format='A4', $unicode=true, $encoding='UTF-8', $diskcache=false, $pdfa=false);

		$pdf->SetTitle($this->title);
		$pdf->SetSubject($this->title);
		$pdf->SetAuthor($this->title);
		$pdf->SetCreator($this->title);
		$pdf->SetKeywords($this->title);
		

		$pdf->AddPage();
		$pdf->writeHTML($html, true, false, true, false, '');
		
		$pdf->Output($this->title.'.pdf');
	}

}