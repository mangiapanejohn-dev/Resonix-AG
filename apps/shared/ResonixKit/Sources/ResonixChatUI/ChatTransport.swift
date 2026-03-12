import Foundation

public enum ResonixChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(ResonixChatEventPayload)
    case agent(ResonixAgentEventPayload)
    case seqGap
}

public protocol ResonixChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> ResonixChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [ResonixChatAttachmentPayload]) async throws -> ResonixChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> ResonixChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<ResonixChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension ResonixChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "ResonixChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> ResonixChatSessionsListResponse {
        throw NSError(
            domain: "ResonixChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
