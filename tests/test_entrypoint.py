from mitra.__main__ import main


def test_main_reports_prototype_mode(capsys):
    assert main() == 0
    output = capsys.readouterr().out
    assert "prototype mode" in output
    assert "No AI model" in output
