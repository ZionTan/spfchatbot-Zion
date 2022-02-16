const AWS = require("aws-sdk");
AWS.config.update({
  region: "ap-southeast-1",
});
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "spf_Officer_Database";
const conditionPath = "/condition";
const officersPath = "/officers";
const spf_all_officersPath = "/spf_all_officers";

exports.handler = async function (event) {
  console.log("Request event: ", event);
  let response;
  switch (true) {
    case event.httpMethod === "GET" && event.path === conditionPath:
      response = buildResponse(200);
      break;
    case event.httpMethod === "GET" && event.path === officersPath:
      response = await getofficers(event.queryStringParameters.FirstName);
      break;
    case event.httpMethod === "GET" && event.path === spf_all_officersPath:
      response = await getspf_all_officers();
      break;
    case event.httpMethod === "POST" && event.path === officersPath:
      response = await saveofficers(JSON.parse(event.body));
      break;
    case event.httpMethod === "PATCH" && event.path === officersPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyofficers(
        requestBody.FirstName,
        requestBody.updateKey,
        requestBody.updateValue
      );
      break;
    case event.httpMethod === "DELETE" && event.path === officersPath:
      response = await deleteofficers(JSON.parse(event.body).FirstName);
      break;
    default:
      response = buildResponse(404, "404 Not Found");
  }
  return response;
};

async function getofficers(FirstName) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      FirstName: FirstName,
    },
  };
  return await dynamodb
    .get(params)
    .promise()
    .then(
      (response) => {
        return buildResponse(200, response.Item);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

async function getspf_all_officers() {
  const params = {
    TableName: dynamodbTableName,
  };
  const allspf_all_officers = await scanDynamoRecords(params, []);
  const body = {
    spf_all_officers: allspf_all_officers,
  };
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (error) {
    console.error(
      "Do your custom error handling here. I am just gonna log it: ",
      error
    );
  }
}

async function saveofficers(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody,
  };
  return await dynamodb
    .put(params)
    .promise()
    .then(
      () => {
        const body = {
          Operation: "SAVE",
          Message: "SUCCESS",
          Item: requestBody,
        };
        return buildResponse(200, body);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

async function modifyofficers(FirstName, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      FirstName: FirstName,
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return await dynamodb
    .update(params)
    .promise()
    .then(
      (response) => {
        const body = {
          Operation: "UPDATE",
          Message: "SUCCESS",
          UpdatedAttributes: response,
        };
        return buildResponse(200, body);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

async function deleteofficers(FirstName) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      FirstName: FirstName,
    },
    ReturnValues: "ALL_OLD",
  };
  return await dynamodb
    .delete(params)
    .promise()
    .then(
      (response) => {
        const body = {
          Operation: "DELETE",
          Message: "SUCCESS",
          Item: response,
        };
        return buildResponse(200, body);
      },
      (error) => {
        console.error(
          "Do your custom error handling here. I am just gonna log it: ",
          error
        );
      }
    );
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
