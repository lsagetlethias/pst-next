/**
 * nidType (5 bits): Identifies the type of the node represented by the NID.
 * 
 * The following table specifies a list of values for nidType. However, it is worth noting that nidType has no meaning to the structures defined in the NDB Layer.
 * 
 * Associated nidIndex is on 27 bits.
 */
export enum NID_TYPE {
    /** Heap node */
    HID = 0x00,
    /** Internal node */
    INTERNAL = 0x01,
    /** Normal folder object */
    NORMAL_FOLDER = 0x02,
    /** Search folder object */
    SEARCH_FOLDER = 0x03,
    /** Normal message object */
    NORMAL_MESSAGE = 0x04,
    /** Attachment object */
    ATTACHMENT = 0x05,
    /** Queue of changed objects for search Folder objects */
    SEARCH_UPDATE_QUEUE = 0x06,
    /** Defines the search criteria for a search Folder object */
    SEARCH_CRITERIA_OBJECT = 0x07,
    /** Folder associated information (FAI) Message object (PC) */
    ASSOC_MESSAGE = 0x08,
    /** Internal, persisted view-related */
    CONTENTS_TABLE_INDEX = 0x0A,
    /** Receive Folder object (Inbox) */
    RECEIVE_FOLDER_TABLE = 0x0B,
    /** Outbound queue (Outbox) */
    OUTGOING_QUEUE_TABLE = 0x0C,
    /** Hierarchy table (TC) */
    HIERARCHY_TABLE = 0x0D,
    /** Contents table (TC) */
    CONTENTS_TABLE = 0x0E,
    /** FAI contents table (TC) */
    ASSOC_CONTENTS_TABLE = 0x0F,
    /** Contents table (TC) of a search Folder object */
    SEARCH_CONTENTS_TABLE = 0x10,
    /** Attachment table (TC) */
    ATTACHMENT_TABLE = 0x11,
    /** Recipient table (TC) */
    RECIPIENT_TABLE = 0x12,
    /** Internal, persisted view-related */
    SEARCH_TABLE_INDEX = 0x13,
    /** LTP */
    LTP = 0x1F
}