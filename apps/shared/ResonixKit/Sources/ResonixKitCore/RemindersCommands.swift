import Foundation

public enum ResonixRemindersCommand: String, Codable, Sendable {
    case list = "reminders.list"
    case add = "reminders.add"
}

public enum ResonixReminderStatusFilter: String, Codable, Sendable {
    case incomplete
    case completed
    case all
}

public struct ResonixRemindersListParams: Codable, Sendable, Equatable {
    public var status: ResonixReminderStatusFilter?
    public var limit: Int?

    public init(status: ResonixReminderStatusFilter? = nil, limit: Int? = nil) {
        self.status = status
        self.limit = limit
    }
}

public struct ResonixRemindersAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var dueISO: String?
    public var notes: String?
    public var listId: String?
    public var listName: String?

    public init(
        title: String,
        dueISO: String? = nil,
        notes: String? = nil,
        listId: String? = nil,
        listName: String? = nil)
    {
        self.title = title
        self.dueISO = dueISO
        self.notes = notes
        self.listId = listId
        self.listName = listName
    }
}

public struct ResonixReminderPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var dueISO: String?
    public var completed: Bool
    public var listName: String?

    public init(
        identifier: String,
        title: String,
        dueISO: String? = nil,
        completed: Bool,
        listName: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.dueISO = dueISO
        self.completed = completed
        self.listName = listName
    }
}

public struct ResonixRemindersListPayload: Codable, Sendable, Equatable {
    public var reminders: [ResonixReminderPayload]

    public init(reminders: [ResonixReminderPayload]) {
        self.reminders = reminders
    }
}

public struct ResonixRemindersAddPayload: Codable, Sendable, Equatable {
    public var reminder: ResonixReminderPayload

    public init(reminder: ResonixReminderPayload) {
        self.reminder = reminder
    }
}
