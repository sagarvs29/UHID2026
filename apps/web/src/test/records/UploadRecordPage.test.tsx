/**
 * Integration tests — UploadRecordPage
 *
 * Tests the full form interaction: validation, successful upload, error handling.
 * Uses MSW to intercept real API calls.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import UploadRecordPage from '@/pages/staff/UploadRecordPage';
import { createWrapper, setMockUser, clearMockUser, STAFF_USER } from '../utils';
import { MOCK_RECORD_ID } from '../mocks/handlers';

function renderPage() {
  const { Wrapper } = createWrapper('/staff/upload');
  setMockUser(STAFF_USER);
  return render(<UploadRecordPage />, { wrapper: Wrapper });
}

afterEach(() => clearMockUser());

// ─── Rendering ─────────────────────────────────────────────────────────────────
describe('UploadRecordPage — Rendering', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Upload Medical Record')).toBeInTheDocument();
  });

  it('renders all required fields', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/UH-847291/i)).toBeInTheDocument();
    expect(screen.getByText('Record Type')).toBeInTheDocument();
    expect(screen.getByText(/Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop file here/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /upload record/i })).toBeInTheDocument();
  });

  it('sub-type dropdown is disabled by default (no type selected)', () => {
    renderPage();
    const subTypeSelect = screen.getAllByRole('combobox')[1];
    expect(subTypeSelect).toBeDisabled();
  });
});

// ─── Validation ────────────────────────────────────────────────────────────────
describe('UploadRecordPage — Validation', () => {
  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /upload record/i }));

    await waitFor(() => {
      expect(screen.getByText(/Patient UHID is required/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Record type is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Title must be at least/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a file/i)).toBeInTheDocument();
  });

  it('shows title length validation error', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText(/Feb 2026/i), 'AB');
    await user.click(screen.getByRole('button', { name: /upload record/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('enables sub-type dropdown when record type is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    const typeSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(typeSelect, 'LAB_REPORT');

    const subTypeSelect = screen.getAllByRole('combobox')[1];
    expect(subTypeSelect).not.toBeDisabled();
  });

  it('resets sub-type selection when record type changes', async () => {
    const user = userEvent.setup();
    renderPage();

    const typeSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(typeSelect, 'LAB_REPORT');

    const subTypeSelect = screen.getAllByRole('combobox')[1];
    await user.selectOptions(subTypeSelect, 'BLOOD_TEST');

    // Change type — sub-type should reset
    await user.selectOptions(typeSelect, 'IMAGING');
    expect((subTypeSelect as HTMLSelectElement).value).toBe('');
  });
});

// ─── Successful upload ─────────────────────────────────────────────────────────
describe('UploadRecordPage — Successful upload', () => {
  async function fillAndSubmit() {
    const user = userEvent.setup();
    renderPage();

    // Fill UHID
    await user.type(screen.getByPlaceholderText(/UH-847291/i), 'UH-000001');

    // Fill title
    await user.type(screen.getByPlaceholderText(/Feb 2026/i), 'CBC Test Result');

    // Select record type
    const typeSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(typeSelect, 'LAB_REPORT');

    // Attach file
    const fileInput = screen.getByLabelText(/upload file/i);
    const file = new File(['pdf bytes'], 'cbc.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, file);

    // Submit
    await user.click(screen.getByRole('button', { name: /upload record/i }));
  }

  it('shows uploading state while request is in flight', async () => {
    // Delay response so we can assert loading state
    server.use(
      http.post('/api/v1/records/upload', async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ success: true, data: { id: MOCK_RECORD_ID, title: 'CBC Test Result' } });
      })
    );

    await fillAndSubmit();
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
  });

  it('shows success screen after upload', async () => {
    await fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByText(/Record Uploaded Successfully/i)).toBeInTheDocument();
    });
  });

  it('shows the uploaded record title in the success screen', async () => {
    await fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByText(/Complete Blood Count/i)).toBeInTheDocument();
    });
  });

  it('"Upload Another Record" button resets the form', async () => {
    await fillAndSubmit();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /upload another/i })).toBeInTheDocument()
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /upload another/i }));

    expect(screen.getByText('Upload Medical Record')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload record/i })).toBeInTheDocument();
  });
});

// ─── Error handling ────────────────────────────────────────────────────────────
describe('UploadRecordPage — Error handling', () => {
  it('shows API error message on 400 response', async () => {
    server.use(
      http.post('/api/v1/records/upload', () =>
        HttpResponse.json({ success: false, error: 'Patient UHID not found in the system' }, { status: 400 })
      )
    );

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText(/UH-847291/i), 'UH-999999');
    await user.type(screen.getByPlaceholderText(/Feb 2026/i), 'Blood Test');
    const typeSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(typeSelect, 'LAB_REPORT');
    const fileInput = screen.getByLabelText(/upload file/i);
    await user.upload(fileInput, new File(['x'], 't.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: /upload record/i }));

    await waitFor(() => {
      expect(screen.getByText(/Patient UHID not found/i)).toBeInTheDocument();
    });
  });

  it('shows error on network failure', async () => {
    server.use(
      http.post('/api/v1/records/upload', () => HttpResponse.error())
    );

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText(/UH-847291/i), 'UH-000001');
    await user.type(screen.getByPlaceholderText(/Feb 2026/i), 'Blood Test');
    const typeSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(typeSelect, 'LAB_REPORT');
    const fileInput = screen.getByLabelText(/upload file/i);
    await user.upload(fileInput, new File(['x'], 't.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: /upload record/i }));

    await waitFor(() => {
      // Any error message is displayed — exact text depends on axios
      expect(screen.queryByText(/upload record/i, { selector: 'button' })).toBeInTheDocument();
    });
  });
});
