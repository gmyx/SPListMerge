SPListMerge
===========

A function that allows retriving multiple lists and doing a JOIN on them in Sharepoint

How to use
==========
Input Format
------
```JavaScript
{ table1Name: 
	{ fields: 
		{field1inSharepoint: OutputName1, field2inSharepoint: OutputName2, fieldninSharepoint: OutputNamen }
		join (optional): { table2Name {... same as above ...}
			sourceField: 'nameInSharepointOfSource',
			targetField: 'nameInSharepointOfTarget
		} //end join
			where (optional): {join operator: {
							fieldName1: {
								value: value, type (optional): type, operator: op},
						 	fieldName2: {
								value: value, type (optional): type, alias (optional): alias, operator: op}
	} // end single table
	table3Name {...},
	tablenName {...}
} //end tables
```

Notes:
*the join operator can be either a 'and' or an 'or'. In both cases, they can only contain 2 items (Sharepoint limitation)
*the where clause is built similar to the CAML where clause, they can also be nested like the CAML where clause
*the where clause can be simplified if no joins are used. just include a single fieldName structre instead of a logical operator
* in cases where you need the field name repeated, use a placeholder in fieldNamen and use the alias property to specify it's real name 

Sample code to use in Sharepoint
--------------------------------
```JavaScript
function receiveData(aJSON) {
	//do something with the results
	$("div#output").text("Results: "); // + JSON.stringify(aJSON));
}


var lInput = {
				DMDB2: {				
					fields: {Milestone: 'Milestone'},					
					join: {
							Positions: {
								fields: {RC_x0020_Region: 'RCRegion',
										 _x0052_C: 'RC'},
								sourceField: 'Position',
								targetField: 'ID'}, //end positions
							 Employees: {
							 	fields: {Employee_x0020_First_x0020_Name: 'firstName',
									  	 Employee_x0020_Last_x0020_Name: 'lastName'},
								sourceField: 'Employee',
								targetField: 'ID'} //end employees
							}, //end join
					where: {File_x0020_Status: {value: 'Completed', operator: 'Neq'}}
				} // end DMDB2
			};// end var lInput


SPListMerge.getLists(lInput, receiveData); //call to the multiple lists
```

Verion history
==============
0.1: Initial Release
0.2: Many minor bug fixes

Future possibilities
====================
* More optimized 'get' of joinned fields