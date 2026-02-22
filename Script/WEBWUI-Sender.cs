using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

public class CPHInline
{
    private static readonly HttpClient client = new HttpClient()
    {
        Timeout = TimeSpan.FromSeconds(30)
    };

    static CPHInline()
    {
        client.DefaultRequestHeaders.Add("User-Agent", "WEBUI-Webhook-Sender/1.0");
    }

    public bool SendOnly()
    {
        try
        {
            CPH.LogVerbose("=== WEBUI Webhook Sender - SendOnly Mode ===");

            var (payload, webhookUrl) = GetPayloadAndWebhookUrl();
            if (payload == null || string.IsNullOrEmpty(webhookUrl)) return false;

            webhookUrl = EnsureWaitTrue(webhookUrl);

            string processedPayload = ReplaceStreamerBotVariables(payload.ToString(Formatting.None));
            var (finalPayload, _) = ReplaceAutoTimestampsWithValue(processedPayload);

            CPH.LogDebug($"Payload size: {finalPayload.Length} characters");

            return SendWebhookAsync(webhookUrl, finalPayload).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            CPH.LogError($"Critical error in SendOnly: {ex.Message}");
            return false;
        }
    }

    public bool EditMode()
    {
        try
        {
            CPH.LogVerbose("=== WEBUI Webhook Sender - EditMode ===");

            var (payload, webhookUrl) = GetPayloadAndWebhookUrl();
            if (payload == null || string.IsNullOrEmpty(webhookUrl)) return false;

            webhookUrl = EnsureWaitTrue(webhookUrl);

            string variableName = GenerateDynamicVariableName();
            CPH.LogInfo($"Using variable: {variableName}");

            string processedPayload = ReplaceStreamerBotVariables(payload.ToString(Formatting.None));
            CPH.LogDebug($"Payload size: {processedPayload.Length} characters");

            return EditModeWebhookAsync(webhookUrl, processedPayload, variableName).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            CPH.LogError($"Critical error in EditMode: {ex.Message}");
            return false;
        }
    }

    private (JObject payload, string webhookUrl) GetPayloadAndWebhookUrl()
    {
        string payloadJson = "";
        CPH.TryGetArg<string>("WEBWUI_WebhookPayload", out payloadJson);

        if (string.IsNullOrEmpty(payloadJson))
            payloadJson = CPH.GetGlobalVar<string>("WEBWUI_WebhookPayload", true);

        CPH.TryGetArg<string>("WEBWUI_WebhookURL", out string fallbackUrl);

        if (string.IsNullOrEmpty(payloadJson))
        {
            CPH.LogError("No webhook payload found");
            return (null, null);
        }

        JObject rootObject;
        try
        {
            rootObject = JObject.Parse(payloadJson);
        }
        catch (JsonException ex)
        {
            CPH.LogError($"JSON parsing failed: {ex.Message}");
            return (null, null);
        }

        JObject payload = rootObject["payload"]?.ToObject<JObject>();
        string webhookUrl = rootObject["WebHookUrl"]?.ToString();

        if (payload == null)
        {
            CPH.LogError("Missing payload section");
            return (null, null);
        }

        // Priority: Argument overrides Payload
        if (!string.IsNullOrEmpty(fallbackUrl))
            webhookUrl = fallbackUrl;

        if (string.IsNullOrEmpty(webhookUrl))
        {
            CPH.LogError("No webhook URL found");
            return (null, null);
        }

        return (payload, webhookUrl);
    }

    private async Task<bool> SendWebhookAsync(string webhookUrl, string payloadJson)
    {
        var (success, _) = await PostWithRetryAsync(webhookUrl, payloadJson);
        return success;
    }

    private async Task<bool> EditModeWebhookAsync(string webhookUrl, string payloadJson, string variableName)
    {
        string lastMessageId = CPH.GetGlobalVar<string>(variableName, false);

        if (!string.IsNullOrEmpty(lastMessageId))
        {
            CPH.LogInfo($"Found existing message ID: {lastMessageId} - attempting PATCH");

            string timestampVarName = variableName + "_Timestamp";
            string storedTimestamp = CPH.GetGlobalVar<string>(timestampVarName, false);

            if (!string.IsNullOrEmpty(storedTimestamp))
                CPH.LogDebug($"Restoring timestamp: {storedTimestamp}");

            string editPayload = RestoreTimestampInPayload(payloadJson, storedTimestamp);
            
            // Replace any remaining auto-timestamps before sending
            var (processedEditPayload, _) = ReplaceAutoTimestampsWithValue(editPayload);
            
            // Ensure missing content clears the previous content on Discord
            processedEditPayload = NormalizeEditPayload(processedEditPayload);
            
            bool editSuccess = await EditExistingMessageAsync(webhookUrl, processedEditPayload, lastMessageId);

            if (editSuccess)
            {
                CPH.LogInfo("Message edited successfully (PATCH)");
                return true;
            }

            CPH.LogWarn("Edit failed, falling back to new message (POST)");
            CPH.SetGlobalVar(variableName, "", false);
        }
        else
        {
            CPH.LogInfo("No previous message ID found - sending new message (POST)");
        }

        var (newMessagePayload, timestamp) = ReplaceAutoTimestampsWithValue(payloadJson);
        return await SendWebhookWithIdStorageAsync(webhookUrl, newMessagePayload, variableName, timestamp);
    }

    private async Task<bool> SendWebhookWithIdStorageAsync(string webhookUrl, string payloadJson, string variableName, string timestamp)
    {
        var (success, messageId) = await PostWithRetryAsync(webhookUrl, payloadJson);

        if (success && !string.IsNullOrEmpty(messageId))
        {
            CPH.SetGlobalVar(variableName, messageId, false);
            CPH.LogDebug($"Stored message ID in {variableName}: {messageId}");

            if (!string.IsNullOrEmpty(timestamp))
            {
                string timestampVarName = variableName + "_Timestamp";
                CPH.SetGlobalVar(timestampVarName, timestamp, false);
                CPH.LogDebug($"Stored timestamp in {timestampVarName}: {timestamp}");
            }
        }

        return success;
    }

    private string GenerateDynamicVariableName()
    {
        try
        {
            string actionName = "";
            bool hasActionName = CPH.TryGetArg<string>("actionName", out actionName);

            string customSuffix = "";
            CPH.TryGetArg<string>("WEBWUI_EditSuffix", out customSuffix);

            string variableName = "WEBWUI_EditMsgId";

            if (hasActionName && !string.IsNullOrEmpty(actionName))
                variableName += "_" + SanitizeVariableName(actionName);
            else
                variableName += "_Default";

            if (!string.IsNullOrEmpty(customSuffix))
                variableName += "_" + SanitizeVariableName(customSuffix);

            return variableName;
        }
        catch (Exception ex)
        {
            CPH.LogError($"Error generating variable name: {ex.Message}");
            return "WEBWUI_EditMsgId_Error";
        }
    }

    private string SanitizeVariableName(string name)
    {
        if (string.IsNullOrEmpty(name)) return "";

        var result = System.Text.RegularExpressions.Regex.Replace(name, @"[^a-zA-Z0-9_]", "_");
        result = System.Text.RegularExpressions.Regex.Replace(result, @"_+", "_");
        return result.Trim('_');
    }

    private string ReplaceStreamerBotVariables(string text)
    {
        try
        {
            string result = text;
            int replacements = 0;

            var globalMatches = System.Text.RegularExpressions.Regex.Matches(text, @"~([^~]+)~");
            foreach (System.Text.RegularExpressions.Match match in globalMatches)
            {
                string variableName = match.Groups[1].Value;
                string variableValue = CPH.GetGlobalVar<string>(variableName, true) ?? "";

                if (!string.IsNullOrEmpty(variableValue))
                {
                    // Escape JSON special characters to prevent breaking the payload
                    string escapedValue = JsonConvert.ToString(variableValue).Trim('"');
                    result = result.Replace(match.Value, escapedValue);
                    replacements++;
                }
            }

            var argMatches = System.Text.RegularExpressions.Regex.Matches(result, @"%([^%]+)%");
            foreach (System.Text.RegularExpressions.Match match in argMatches)
            {
                string argumentName = match.Groups[1].Value;
                string argumentValue = "";

                if (CPH.TryGetArg<string>(argumentName, out argumentValue) && !string.IsNullOrEmpty(argumentValue))
                {
                    // Escape JSON special characters to prevent breaking the payload
                    string escapedValue = JsonConvert.ToString(argumentValue).Trim('"');
                    result = result.Replace(match.Value, escapedValue);
                    replacements++;
                }
            }

            CPH.LogDebug($"Variables replaced: {replacements}");
            return result;
        }
        catch (Exception ex)
        {
            CPH.LogError($"Error replacing variables: {ex.Message}");
            return text;
        }
    }

    private (string payload, string timestamp) ReplaceAutoTimestampsWithValue(string text)
    {
        try
        {
            if (!text.Contains("__AUTO_TIMESTAMP__"))
                return (text, null);

            string currentTimestamp = DateTime.UtcNow.ToString("O");
            string result = text.Replace("\"__AUTO_TIMESTAMP__\"", $"\"{currentTimestamp}\"");

            CPH.LogDebug($"Auto-timestamp replaced: {currentTimestamp}");
            return (result, currentTimestamp);
        }
        catch (Exception ex)
        {
            CPH.LogError($"Error replacing auto timestamp: {ex.Message}");
            return (text, null);
        }
    }

    private async Task<bool> EditExistingMessageAsync(string webhookUrl, string payloadJson, string messageId)
    {
        try
        {
            string cleanWebhookUrl = webhookUrl.Replace("?wait=true", "").Replace("&wait=true", "");
            string editUrl = cleanWebhookUrl.TrimEnd('/') + "/messages/" + messageId;

            var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(new HttpMethod("PATCH"), editUrl)
            {
                Content = content
            };

            CPH.LogDebug($"Sending PATCH request for message ID: {messageId}");
            HttpResponseMessage response = await client.SendAsync(request);

            CPH.LogDebug($"Discord response: {response.StatusCode}");

            if (response.IsSuccessStatusCode)
            {
                CPH.LogInfo("Message edited successfully");
                return true;
            }
            else
            {
                if ((int)response.StatusCode == 404)
                    CPH.LogWarn("Message not found (deleted or expired)");
                else
                    CPH.LogError($"Discord edit error: {response.StatusCode}");

                return false;
            }
        }
        catch (Exception ex)
        {
            CPH.LogError($"Edit error: {ex.Message}");
            return false;
        }
    }

    private string RestoreTimestampInPayload(string payloadJson, string storedTimestamp)
    {
        try
        {
            JObject payloadObj = JObject.Parse(payloadJson);

            if (payloadObj["embeds"] is JArray embedsArray)
            {
                for (int i = 0; i < embedsArray.Count; i++)
                {
                    if (embedsArray[i] is JObject embed)
                    {
                        if (!string.IsNullOrEmpty(storedTimestamp))
                        {
                            if (embed["timestamp"] != null)
                                embed.Remove("timestamp");
                            embed["timestamp"] = storedTimestamp;
                        }
                        else if (embed["timestamp"] != null)
                        {
                            embed.Remove("timestamp");
                        }
                    }
                }
            }

            return payloadObj.ToString(Formatting.None);
        }
        catch (Exception ex)
        {
            CPH.LogError($"Error restoring timestamp: {ex.Message}");
            return payloadJson;
        }
    }

    private string NormalizeEditPayload(string payloadJson)
    {
        try
        {
            JObject payloadObj = JObject.Parse(payloadJson);

            // If content is omitted, explicitly clear it
            if (payloadObj["content"] == null)
                payloadObj["content"] = "";

            // If embeds are omitted, explicitly clear them
            if (payloadObj["embeds"] == null)
                payloadObj["embeds"] = new JArray();

            // If embeds exist, ensure fields are present so removed fields are cleared
            if (payloadObj["embeds"] is JArray embedsArray)
            {
                for (int i = 0; i < embedsArray.Count; i++)
                {
                    if (embedsArray[i] is JObject embedObj && embedObj["fields"] == null)
                        embedObj["fields"] = new JArray();
                }
            }

            return payloadObj.ToString(Formatting.None);
        }
        catch (Exception ex)
        {
            CPH.LogError($"Error normalizing edit payload: {ex.Message}");
            return payloadJson;
        }
    }

    private async Task<(bool success, string messageId)> PostWithRetryAsync(string webhookUrl, string payloadJson)
    {
        try
        {
            for (int attempt = 0; attempt <= 1; attempt++)
            {
                var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");

                CPH.LogDebug("Sending POST request to Discord");
                HttpResponseMessage response = await client.PostAsync(webhookUrl, content);
                string responseBody = await response.Content.ReadAsStringAsync();

                CPH.LogDebug($"Discord response: {response.StatusCode}");

                if (response.IsSuccessStatusCode)
                {
                    CPH.LogInfo("Webhook sent successfully");

                    string messageId = null;
                    if (!string.IsNullOrEmpty(responseBody) && responseBody.StartsWith("{"))
                    {
                        try
                        {
                            var responseObj = JObject.Parse(responseBody);
                            messageId = responseObj["id"]?.ToString();
                        }
                        catch { }
                    }

                    return (true, messageId);
                }

                if ((int)response.StatusCode == 429 && attempt == 0)
                {
                    int delayMs = GetRetryDelayMilliseconds(response, responseBody);
                    CPH.LogWarn($"Rate limit reached, retrying in {delayMs} ms");
                    await Task.Delay(delayMs);
                    continue;
                }

                CPH.LogError($"Discord error: {response.StatusCode} - {Truncate(responseBody, 500)}");
                return (false, null);
            }

            return (false, null);
        }
        catch (Exception ex)
        {
            CPH.LogError($"Send error: {ex.Message}");
            return (false, null);
        }
    }

    private int GetRetryDelayMilliseconds(HttpResponseMessage response, string responseBody)
    {
        int defaultDelayMs = 1000;

        try
        {
            if (response.Headers.TryGetValues("Retry-After", out var values))
            {
                string raw = values.FirstOrDefault();
                if (int.TryParse(raw, out int seconds) && seconds > 0)
                    return seconds * 1000;
            }

            if (!string.IsNullOrEmpty(responseBody) && responseBody.StartsWith("{"))
            {
                var responseObj = JObject.Parse(responseBody);
                double? retryAfter = responseObj["retry_after"]?.Value<double>();
                if (retryAfter.HasValue && retryAfter.Value > 0)
                    return (int)Math.Ceiling(retryAfter.Value * 1000);
            }
        }
        catch
        {
            return defaultDelayMs;
        }

        return defaultDelayMs;
    }

    private string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
            return value ?? string.Empty;

        return value.Substring(0, maxLength) + "...";
    }

    private string EnsureWaitTrue(string webhookUrl)
    {
        if (string.IsNullOrEmpty(webhookUrl))
            return webhookUrl;

        if (webhookUrl.IndexOf("wait=true", StringComparison.OrdinalIgnoreCase) >= 0)
            return webhookUrl;

        return webhookUrl.Contains("?") ? webhookUrl + "&wait=true" : webhookUrl + "?wait=true";
    }
}
