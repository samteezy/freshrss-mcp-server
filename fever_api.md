Fever API for FreshRSS (Version 0.1)

Endpoint: /fever.php
Method: POST
Authentication: API key sent via POST field 'api_key'
API key format: md5(username:api_password) combination

Capabilities and Endpoints:

1. Retrieve Groups (categories)
   - Endpoint: /fever.php?groups
   - Payload: None (optional parameters not supported)
   - Response:
     {
       "groups": [
         {"id": 1, "title": "News"},
         {"id": 2, "title": "Technology"}
       ],
       "feeds_groups": [
         {"feed_id": 1, "group_id": 1},
         {"feed_id": 2, "group_id": 2}
       ]
     }

2. Retrieve Feeds
   - Endpoint: /fever.php?feeds
   - Payload: None (optional parameters not supported)
   - Response:
     {
       "feeds": [
         {
           "id": 1,
           "favicon_id": 1,
           "title": "TechCrunch",
           "url": "https://feeds.feedburner.com/techcrunch/",
           "site_url": "https://techcrunch.com",
           "is_spark": 0,
           "last_updated_on_time": 1712345678
         }
       ],
       "feeds_groups": [
         {"feed_id": 1, "group_id": 1}
       ]
     }

3. Retrieve Favicons
   - Endpoint: /fever.php?favicons
   - Payload: None
   - Response:
     {
       "favicons": [
         {
           "id": 1,
           "data": "image/x-icon;base64,AAABAAEAEBAQAAEABAAoAQAAJgAAACgAAAAQAAAAIAAAAAEA"
         }
       ]
     }

4. Retrieve Items (entries)
   - Endpoint: /fever.php?items
   - Payload:
     - since_id (optional): ID of the last seen entry (integer)
     - max_id (optional): ID of the newest entry to fetch (integer)
     - count (optional): number of entries to return (integer, default: 50)
     - feed_id (optional): filter by feed ID (integer)
     - is_read (optional): filter by read status (0: unread, 1: read)
     - is_favorite (optional): filter by favorite status (0: not favorite, 1: favorite)
   - Response:
     {
       "total_items": 100,
       "items": [
         {
           "id": 12345,
           "feed_id": 1,
           "title": "FreshRSS 1.20 Released",
           "author": "Kevin Papst",
           "content": "A new version of FreshRSS is now available...",
           "link": "https://freshrss.org/news/1.20",
           "date": 1712345678,
           "is_read": 0,
           "is_favorite": 1,
           "tags": ["news", "freshrss"],
           "guid": "urn:uuid:abc123"
         }
       ]
     }

5. Retrieve Unread Item IDs
   - Endpoint: /fever.php?unread_item_ids
   - Payload: None
   - Response:
     {
       "unread_item_ids": [12345, 12346, 12347]
     }

6. Retrieve Saved (Favorite) Item IDs
   - Endpoint: /fever.php?saved_item_ids
   - Payload: None
   - Response:
     {
       "saved_item_ids": [12345, 12346]
     }

7. Retrieve Links (not implemented)
   - Endpoint: /fever.php?links
   - Payload: None
   - Response: Not Implemented (HTTP 501)

Note: The 'refresh' operation is not supported (HTTP 501 Not Implemented).

Authentication:
- API key must be sent in POST request as 'api_key'.
- Key is generated as md5(username:api_password) and stored in DATA_PATH/fever/.key-<hash>.txt.
- User must have enabled the Fever API in FreshRSS settings.

Error Responses:
- HTTP 503 Service Unavailable: If API is globally disabled.
- HTTP 501 Not Implemented: If unsupported operation is requested.
- HTTP 400 or 500: On internal error or invalid input.

All responses are JSON formatted with UTF-8 encoding.