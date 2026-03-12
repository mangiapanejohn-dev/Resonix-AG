package ai.resonix.android.ui

import androidx.compose.runtime.Composable
import ai.resonix.android.MainViewModel
import ai.resonix.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
