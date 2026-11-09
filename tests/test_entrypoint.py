from mitra.__main__ import main


def test_main_reports_scaffold_status(capsys):
    assert main() == 0
    output = capsys.readouterr().out
    assert "development scaffold" in output
    assert "No AI model" in output
    assert "not available yet" in output
