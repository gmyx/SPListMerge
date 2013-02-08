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
		
		//failsafe
		if (aId === "0") {
			return null;
		}

		//prepare
		if (aOut === undefined) {
			aOut = {};
		}

		//add associated fields for required row
		for (lSingleField in aJoin.fields) {
			if (aJoin.fields.hasOwnProperty(lSingleField)) {
				//see if target ID exists, if not skip
				if (aData[aName][aId] !== undefined) {
					//if using an array, it won't work        
					if (aJoin.fields[lSingleField].name !== undefined) {
						if (aJoin.fields[lSingleField].output !== false) {
							aOut[aJoin.fields[lSingleField].name] = aData[aName][aId][aJoin.fields[lSingleField]];
						} //end if output !== false
					} else {
						aOut[aJoin.fields[lSingleField]] = aData[aName][aId][aJoin.fields[lSingleField]];
					} //end if name !== undefined
				} //end if aId !== undefined
			} //end if hasownproperty
		} //end for single field

		//look for furtur joins and recurse
		if (aJoin.join !== undefined) {
			for (lSingleJoin in aJoin.join) {
				if (aJoin.join.hasOwnProperty(lSingleJoin)) {
					//ensure target data exists
					if (aData[aName][aId] !== undefined) {
						aOut = getAssociatedData(aData[aName][aId][aJoin.join[lSingleJoin].sourceField],
							lSingleJoin, aData, aJoin.join[lSingleJoin]);
					} //end aId !==udnefined 
				} //end has own property
			} //end for
		} //end if join !== undefined
		//done!
		return aOut;
	}

	function joinData(aData, aJoin) {
		//all data is gathered and in a JSON format, lets start
		var lSingleTable, lSingleRow, lSingleField, lSingleJoin, lOutput = {}, lOutputSingleRow, lData, lRealName;

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
								lRealName = aJoin[lSingleTable].fields[lSingleField];
								if (lRealName.name !== undefined) {
									//see if output !== false
									if (lRealName.output !== false) {
										//what? yes that is 3 levels of nested objects
										lOutputSingleRow[lSingleRow][lRealName.name] = aData[lSingleTable][lSingleRow][lRealName.name];
									} //end if output !== false
								} else {
									//what? yes that is 3 levels of nested objects
									lOutputSingleRow[lSingleRow][lRealName] = aData[lSingleTable][lSingleRow][lRealName];
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
			var lJSON, lMappings = getMappings(aDataSource), lCount, lIndex, lRow = {}, lSingleField,
				lSourceFields = [], lClutteredFields = [], lClutterPatt = /.*;#(.*)/;
			lJSON = $(xData.responseXML).SPFilterNode("z:row").SPXmlToJson(lMappings);

			//make like of all lookup fields added as sourcefields. Needs to be flattened.
			for (lSingleField in aDataSource.fields) {
				if (aDataSource.fields.hasOwnProperty(lSingleField)) {
					if (aDataSource.fields[lSingleField].asSourceField === true) {
						lSourceFields.push(lSingleField);
					} else if (aDataSource.fields[lSingleField].complex === true) {
						lClutteredFields.push(lSingleField);
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

				//de-clutter if required
				if (lClutteredFields[0] !== undefined) {
					for (lIndex = 0; lIndex < lClutteredFields.length; lIndex += 1) {
						//update source field to just ID
						lJSON[lCount][lClutteredFields[lIndex]] = lJSON[lCount][lClutteredFields[lIndex]].match(lClutterPatt)[1];
					}
				}

				lRow[lJSON[lCount][aIDField]] = lJSON[lCount];
			}
			mLists[aName] = lRow; //SP will need mappings to properly filter, but it's not saved
		};
	}

	function properCap(aText) { //ensure the proper capilization of where clauses because sharepoint is picky
		return aText.charAt(0).toUpperCase() + aText.slice(1).toLowerCase();
	}

	function buildSingleWhereClause(aClause, aFieldName) {
		var lOut = "<" + properCap(aClause.operator) + ">"; //open op clause
		if (aClause.alias !== undefined) { 
			lOut += "<FieldRef Name='" + aClause.alias + "'></FieldRef>"; //field ref
		} else {
			lOut += "<FieldRef Name='" + aFieldName + "'></FieldRef>"; //field ref
		}

		//determine if type is specifyed or not and try to see if a number if not
		if (aClause.type !== undefined) {
			if (aClause.type === 'String') {
				lOut += "<Value Type='" + aClause.type + "'>'" + aClause.value + "'";
			} else {
				//assume does not need quotes
				lOut += "<Value Type='" + aClause.type + "'>" + aClause.value;
			}
		} else if ($.isNumeric(aClause.value) === true) {
			lOut += "<Value Type='Integer'>" + aClause.value;
		} else {
			lOut += "<Value Type='String'>'" + aClause.value + "'";
		}
		lOut += "</Value>"; //end value clause
		lOut += "</" + properCap(aClause.operator) + ">"; //end op clause

		return lOut;
	}

	function buildWhereClause(aWhere, aWhereOperator) {
		var lOut = "<" + properCap(aWhereOperator) + ">", lSingleItem;

		for (lSingleItem in aWhere) {
			if (aWhere.hasOwnProperty(lSingleItem)) {
				if (lSingleItem.toLowerCase() === 'and' || lSingleItem.toLowerCase() === 'or') {
					//branch off since this can be recursive
					lOut += buildWhereClause(aWhere[lSingleItem], lSingleItem);
				} else {
					//add this field				
					lOut += buildSingleWhereClause(aWhere[lSingleItem], lSingleItem);
				}
			}
		}

		lOut += "</" + properCap(aWhereOperator) + ">";

		return lOut;
	}

	function internalGetLists(aData, aIsRootLevel) {
		var lSingleTable, lSingleJoin, lSingleField, lSingleWhere, lWhereClause = "", lFields = "", lID, lLookups = [];

		for (lSingleTable in aData) {
			if (aData.hasOwnProperty(lSingleTable)) {
				//pre-pre-step: cleanup local varialbes
				lFields = "";
				lLookups = [];
				lWhereClause = "";

				//Pre step: get list members in order to trap unaddressed lookups (cleaner output)
				$().SPServices({
					operation: "GetList",
					listName: lSingleTable,
					async: false,
					completefunc: function(xData, Status) {
						$(xData.responseXML).find("Fields > Field").each(function() {
							if ($(this).attr("Type") === "Lookup" || $(this).attr("Type") === "Calculated") {
								lLookups[$(this).attr("StaticName")] = $(this).attr("StaticName");
							}
						});
					}
				});

				//step 1, get requested list
				for (lSingleField in aData[lSingleTable].fields) {
					if (aData[lSingleTable].fields.hasOwnProperty(lSingleField)) {
						lFields += "<FieldRef Name='" + lSingleField + "' />";

						//check if requested field is in list of lookups / calculated for de-cluttering latter
						if (lLookups[lSingleField] !== undefined) {
							//make not of it in the aData structure
							aData[lSingleTable].fields[lSingleField] = {name: lSingleField, complex: true};
						}
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

				//Id may be a complex (I.E. lookup) field, if yes, add to fields list as complex and hidden
				if (lLookups[lID] !== undefined) {
					//make not of it in the aData structure
					aData[lSingleTable].fields[lID] = {name: lID, complex: true, output: false};
					lFields += "<FieldRef Name='" + lID + "' />";
				} else if (aData[lSingleTable].fields[lID] === undefined) {
					//now we have an Id, look for it in the list and add it if required
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
								if (lSingleWhere.toLowerCase() === 'and' || lSingleWhere.toLowerCase() === 'or') {
									//branch off since this can be recursive
									lWhereClause += buildWhereClause(aData[lSingleTable].where[lSingleWhere], lSingleWhere);
								} else {
									lWhereClause = buildSingleWhereClause(aData[lSingleTable].where[lSingleWhere], lSingleWhere);
								} //end if has join operator
							} //end if has own property for where clauses
						} //end for where clauses
	
						//now get the records
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
