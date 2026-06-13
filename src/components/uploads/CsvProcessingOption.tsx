import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ProcessingOptionsProps {
    options: {
        hasHeaders: boolean;
        delimiter: string;
        skipEmptyLines: boolean;
    };
    setOptions: (options: unknown) => void;
}

const CsvProcessingOptions = ({ options, setOptions }: ProcessingOptionsProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">CSV Processing Options</CardTitle>
                <CardDescription>
                    Configure how your CSV files should be processed
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="has-headers">First row contains headers</Label>
                        <p className="text-sm text-gray-500">
                            Enable if your CSV file has a header row
                        </p>
                    </div>
                    <Switch
                        id="has-headers"
                        checked={options.hasHeaders}
                        onCheckedChange={(checked) =>
                            setOptions({ ...options, hasHeaders: checked })
                        }
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="delimiter">Delimiter</Label>
                    <Select
                        value={options.delimiter}
                        onValueChange={(value) =>
                            setOptions({ ...options, delimiter: value })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select delimiter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value=",">Comma (,)</SelectItem>
                            <SelectItem value=";">Semicolon (;)</SelectItem>
                            <SelectItem value="\t">Tab (\t)</SelectItem>
                            <SelectItem value="|">Pipe (|)</SelectItem>
                            <SelectItem value=" ">Space ( )</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="skip-empty">Skip empty lines</Label>
                        <p className="text-sm text-gray-500">
                            Exclude rows that are completely empty
                        </p>
                    </div>
                    <Switch
                        id="skip-empty"
                        checked={options.skipEmptyLines}
                        onCheckedChange={(checked) =>
                            setOptions({ ...options, skipEmptyLines: checked })
                        }
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default CsvProcessingOptions;