/*	STEP 1: Get ALL Data, including from nested (using where clause if added) and store results in array. Where clause respected in first level only.
		* Caveat: If same list is included more than once, get once WIHTOUT the where (TO DO IN LATER VERSION)
	STEP 2: Merge data based on input
	STEP 3: output merged data
*/
(function (JSONJoin) {
	"use strict";
	//merge two JSOn objects together - no joins here
	JSONJoin.merge = function (aTarget, aSource) {
		var lSingleItem;

		for (lSingleItem in aSource) {
			if (aSource.hasOwnProperty(lSingleItem)) {
				aTarget[lSingleItem] = aSource[lSingleItem];
			}
		}

		return aTarget;
	};


	function getAssociatedData(aId, aName, aData, aJoin, aOut) {
		var lSingleField, lSingleJoin;

		//prepare
		if (aOut === undefined) {
			aOut = {};
		}

		//add associated fields for required row
		for (lSingleField in aJoin.fields) {
			if (aJoin.fields.hasOwnProperty(lSingleField)) {
				//if using an array, it won't work
				if (aJoin.fields[lSingleField].name !== undefined) {
					if (aJoin.fields[lSingleField].output !== false) {
						aOut[aJoin.fields[lSingleField].name] = aData[aName][aId][aJoin.fields[lSingleField]];
					} //end if output !== false
				} else {
					aOut[aJoin.fields[lSingleField]] = aData[aName][aId][aJoin.fields[lSingleField]];
				} //end if name !== undefined
			} //end if hasownproperty
		} //end for single field

		//look for furtur joins and recurse
		if (aJoin.join !== undefined) {
			for (lSingleJoin in aJoin.join) {
				if (aJoin.join.hasOwnProperty(lSingleJoin)) {
					aOut = JSONJoin.merge(getAssociatedData(aData[aName][aId][aJoin.join[lSingleJoin].sourceField],
						lSingleJoin, aData, aJoin.join[lSingleJoin]), aOut);
				} //end has own property
			} //end for
		} //end if join !== undefined
		//done!
		return aOut;
	}

	function joinData(aData, aJoin) {
		//all data is gathered and in a JSON format, lets start
		var lSingleTable, lSingleRow, lSingleField, lSingleJoin, lOutput = {}, lOutputSingleRow, lData;

		//go throught every base table
		for (lSingleTable in aJoin) {
			if (aJoin.hasOwnProperty(lSingleTable)) {
				lOutputSingleRow = {};

				//go throught each row
				for (lSingleRow in aData[lSingleTable]) {
					if (aData[lSingleTable].hasOwnProperty(lSingleRow)) {

						//copy each row into output
						lOutputSingleRow[lSingleRow] = {};
						for (lSingleField in aJoin[lSingleTable].fields) {
							if (aJoin[lSingleTable].fields.hasOwnProperty(lSingleField)) {
								if (aJoin[lSingleTable].fields[lSingleField].name !== undefined) {
									//see if output !== false
									if (aJoin[lSingleTable].fields[lSingleField].output !== false) {
										//what? yes that is 3 levels of nested objects
										lOutputSingleRow[lSingleRow][lSingleField] = aData[lSingleTable][lSingleRow][lSingleField];
									} //end if output !== false
								} else {
									//what? yes that is 3 levels of nested objects
									lOutputSingleRow[lSingleRow][lSingleField] = aData[lSingleTable][lSingleRow][lSingleField];
								} //end if name !== undefined
							} //end if own property single field
						} //end for single field

						//now get data to be merged, if any
						if (aJoin[lSingleTable].join !== undefined) {
							for (lSingleJoin in aJoin[lSingleTable].join) {
								if (aJoin[lSingleTable].join.hasOwnProperty(lSingleJoin)) {
									lData = getAssociatedData(aData[lSingleTable][lSingleRow][aJoin[lSingleTable].join[lSingleJoin].sourceField],
										lSingleJoin, aData, aJoin[lSingleTable].join[lSingleJoin]);

									lOutputSingleRow[lSingleRow] = JSONJoin.merge(lOutputSingleRow[lSingleRow], lData);
								}
							}
						} //end if join !== undefined
					} //end if has own property for row
				} //end for row

				if (lOutput[lSingleTable] === undefined) {
					lOutput[lSingleTable] = {};
				}
				lOutput[lSingleTable] = lOutputSingleRow;
			} //end if hasOwnProperty
		} //end for

		return lOutput;
	}

	//do as join of two table-like JSON objects based on specific inputs. Single output.
	JSONJoin.join = function (aData, aJoin) {
		/*must be a NamedMap:
			NamedMap: {a: , b: {c:}}
			*/

		//check if input is in the format of {a: [{},{}]}, {b: [{},{}]} or a fully nammed map, if not, convert to nammed map
		var lSingleTable;
		for (lSingleTable in aData) {
			if (aData.hasOwnProperty(lSingleTable)) {
				if (aData[lSingleTable][0] !== undefined) {
					throw ("Input format bad. Must be properly nammed map. See documentation for details.");
				}
			}
		}


		return joinData(aData, aJoin);
	};
}(window.JSONJoin = window.JSONJoin || {}, jQuery));

//SP list merge goes here
(function (SPListMerge) {
	"use strict";
	var mLists = {};

	function getMappings(aDataSource) {
		var lMappings = {},
			lMap = {},
			lSingleField;

		for (lSingleField in aDataSource.fields) {
			if (aDataSource.fields.hasOwnProperty(lSingleField)) {
				//build mappings array to be usedin SPServices's XML to JSON
				if (aDataSource.fields[lSingleField].name !== undefined) {
					lMap.mappedName = aDataSource.fields[lSingleField].name;

					if (aDataSource.fields[lSingleField].objectType !== undefined) {
						lMap.objectType = aDataSource.fields[lSingleField].objectType;
					} else {
						delete lMap.objectType;
					}

					//copy (otherwise it's only a reference and will fail) into the object
					lMappings['ows_' + aDataSource.fields[lSingleField].name] = {mappedName: lMap.mappedName, objectType: lMap.objectType};
				} else {
					lMap.mappedName = aDataSource.fields[lSingleField];

					//copy (otherwise it's only a reference and will fail) into the object
					lMappings['ows_' + lSingleField] = {mappedName: lMap.mappedName};
				}
			}
		}

		return {mapping: lMappings};
	}

	function processResults(aDataSource, aIDField, aName) {
		return function (xData) {
			//convert received XML to JSON
			var lJSON, lMappings = getMappings(aDataSource), lCount, lIndex, lRow = {}, lSingleField, lSourceFields = [];
			lJSON = $(xData.responseXML).SPFilterNode("z:row").SPXmlToJson(lMappings);

			//make like of all lookup fields added as sourcefields. Needs to be flattened.
			for (lSingleField in aDataSource.fields) {
				if (aDataSource.fields.hasOwnProperty(lSingleField)) {
					if (aDataSource.fields[lSingleField].asSourceField === true) {
						lSourceFields.push(lSingleField);
					}
				}
			}

			//output into array - index by ID
			for (lCount = 0; lCount < lJSON.length; lCount += 1) {
				if (lSourceFields[0] !== undefined) {
					for (lIndex = 0; lIndex < lSourceFields.length; lIndex += 1) {
						//update source field to just ID
						lJSON[lCount][lSourceFields[lIndex]] = lJSON[lCount][lSourceFields[lIndex]].lookupId;
					}
				}

				lRow[lJSON[lCount][aIDField]] = lJSON[lCount];
			}
			mLists[aName] = lRow; //SP will need mappings to properly filter, but it's not saved
		};
	}

	function buildSingleWhereClause(aClause, aFieldName) {
		var lOut = "<" + aClause.operator + ">"; //open op clause
		lOut += "<FieldRef Name='" + aFieldName + "'></FieldRef>"; //field ref

		//determine if type is specifyed or not and try to see if a number if not
		if (aClause.type !== undefined) {
			if (aClause.type === 'String') {
				lOut += "<Value Type='" + aClause.type + "'>'" + aClause.value + "'";
			} else {
				//assume int
				lOut += "<Value Type='" + aClause.type + "'>" + aClause.value;
			}
		} else if ($.isNumeric(aClause.value) === true) {
			lOut += "<Value Type='Integer'>" + aClause.value;
		} else {
			lOut += "<Value Type='String'>'" + aClause.value + "'";
		}
		lOut += "</Value>"; //end value clause
		lOut += "</" + aClause.operator + ">"; //end op clause

		return lOut;
	}

	function buildWhereClause(aWhere, aWhereOperator) {
		var lOut = "<" + aWhereOperator + ">", lSingleItem;

		for (lSingleItem in aWhere) {
			if (aWhere.hasOwnProperty(lSingleItem)) {
				if (lSingleItem === 'And' || lSingleItem === 'Or') {
					//branch off since this can be recursive
					lOut += buildWhereClause(aWhere[lSingleItem], lSingleItem);
				} else {
					//add this field				
					lOut += buildSingleWhereClause(aWhere[lSingleItem], lSingleItem);
				}
			}
		}

		lOut += "</" + aWhereOperator + ">";

		return lOut;
	}

	function internalGetLists(aData, aIsRootLevel) {
		var lSingleTable, lSingleJoin, lSingleField, lSingleWhere, lWhereClause = "", lFields = "", lID;

		for (lSingleTable in aData) {
			if (aData.hasOwnProperty(lSingleTable)) {
				//step 1, get requested list
				for (lSingleField in aData[lSingleTable].fields) {
					if (aData[lSingleTable].fields.hasOwnProperty(lSingleField)) {
						lFields += "<FieldRef Name='" + lSingleField + "' />";
					}
				}

				//add join fields, if not added
				if (aData[lSingleTable].join !== undefined) {
					for (lSingleJoin in aData[lSingleTable].join) {
						if (aData[lSingleTable].join.hasOwnProperty(lSingleJoin)) {
							//ensure sourceField is in field list at the sub level
							if (aData[lSingleTable].fields[aData[lSingleTable].join[lSingleJoin].sourceField] === undefined) {
								//add it
								aData[lSingleTable].fields[aData[lSingleTable].join[lSingleJoin].sourceField] = {name: aData[lSingleTable].join[lSingleJoin].sourceField, objectType: 'Lookup', output: false, asSourceField: true};
								lFields += "<FieldRef Name='" + aData[lSingleTable].join[lSingleJoin].sourceField + "' />";
							} //end if sourcefield === undefined
						} //end if hasOwnProerty
					} //end for

					//cascade if required
					internalGetLists(aData[lSingleTable].join, false);
				} //end if join !== undefinded

				//check to see if WE have an targetField, 
				if (aData[lSingleTable].targetField !== undefined) {
					lID = aData[lSingleTable].targetField;
				} else {
					//assument an ID field of ows_ID - sharepoint lists use this field
					lID = 'ID';
				}

				//now we have an Id, look for it in the list and add it if required
				if (aData[lSingleTable].fields[lID] === undefined) {
					//add it
					aData[lSingleTable].fields[lID] = {name: lID, output: false};
					lFields += "<FieldRef Name='" + lID + "' />";
				} //end if field === undefined
				
				//only if on root level, add where clause if exixts
				if (aIsRootLevel === true) {
					if (aData[lSingleTable].where !== undefined) {
						//build where clause
						for (lSingleWhere in aData[lSingleTable].where) {
							if (aData[lSingleTable].where.hasOwnProperty(lSingleWhere)) {
								//see if an join operator
								if (lSingleWhere === 'And' || lSingleWhere === 'Or') {
									//branch off since this can be recursive
									lWhereClause += buildWhereClause(aData[lSingleTable].where[lSingleWhere], lSingleWhere);
								} else {
									lWhereClause = buildSingleWhereClause(aData[lSingleTable].where[lSingleWhere], lSingleWhere);
								} //end if has join operator
							} //end if has own property for where clauses
						} //end for where clauses
	
						//now get the records
						console.log(lWhereClause);
						$().SPServices({
							operation: "GetListItems",
							async: false,
							listName: lSingleTable,
							CAMLViewFields: "<ViewFields>" + lFields + "</ViewFields>",
							CAMLQuery: '<Query><Where>' + lWhereClause + '</Where></Query>',
							completefunc: processResults(aData[lSingleTable], lID, lSingleTable)
						});
					} else {//no wheres here
						//now get the records
						$().SPServices({
							operation: "GetListItems",
							async: false,
							listName: lSingleTable,
							CAMLViewFields: "<ViewFields>" + lFields + "</ViewFields>",
							completefunc: processResults(aData[lSingleTable], lID, lSingleTable)
						});
					}
				} else {
					//now get the records
					$().SPServices({
						operation: "GetListItems",
						async: false,
						listName: lSingleTable,
						CAMLViewFields: "<ViewFields>" + lFields + "</ViewFields>",
						completefunc: processResults(aData[lSingleTable], lID, lSingleTable)
					});
				}

			} // end if hasOwnProperty lSingleTable
		} //end for lSingleTable
	} // end function

	SPListMerge.getLists = function (aData, aCallback) {
		//to do: ensure valid data is passed

		//start step 1
		internalGetLists(aData, true);

		//step 2, merge data and //step 3, callback
		aCallback(JSONJoin.join(mLists, aData));
	};
}(window.SPListMerge = window.SPListMerge || {}, jQuery));

